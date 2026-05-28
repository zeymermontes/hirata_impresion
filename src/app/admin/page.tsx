import Link from "next/link";
import {
  ArrowRight,
  Package,
  TrendingUp,
  TrendingDown,
  Truck,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn, formatMXN } from "@/lib/utils";
import {
  ORDER_STATUS_BADGE,
  ORDER_STATUS_LABEL,
  formatOrderDate,
} from "@/lib/order-status";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

// Order statuses that count as "real money in" — excludes pending (not paid
// yet) and cancelled. Used everywhere revenue is summed so trends aren't
// inflated by abandoned carts.
const REVENUE_STATUSES = [
  "paid",
  "in_production",
  "ready",
  "shipped",
  "delivered",
] as const;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function pctDelta(current: number, prev: number): number | null {
  if (prev === 0) return current === 0 ? 0 : null; // null = no baseline
  return ((current - prev) / prev) * 100;
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const now = new Date();
  const today = startOfDay(now);
  const sevenDaysAgo = addDays(today, -7);
  const fourteenDaysAgo = addDays(today, -14);
  const thirtyDaysAgo = addDays(today, -30);
  const monthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(addDays(monthStart, -1));
  const lastMonthSameDay = addDays(lastMonthStart, now.getDate() - 1);
  // Pull last ~60 days of revenue-bearing orders in one shot so we can slice
  // them locally into the periods we need. Bounded for SMB scale.
  const revenueLookback = addDays(today, -60);

  const [
    revenueOrdersResult,
    pendingResult,
    paidResult,
    readyResult,
    recentOrdersResult,
    profilesCountResult,
    topProducts,
    topCodes,
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("total, created_at, status")
      .gte("created_at", revenueLookback.toISOString())
      .in("status", [...REVENUE_STATUSES])
      .order("created_at", { ascending: true }),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "paid"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "ready"),
    supabase
      .from("orders")
      .select("id, status, total, created_at, user_id, fulfillment")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    loadTopProducts(supabase, thirtyDaysAgo),
    loadTopCodes(),
  ]);

  type RevenueRow = { total: number; created_at: string; status: string };
  const revenueOrders = (revenueOrdersResult.data ?? []) as RevenueRow[];

  function sumInRange(start: Date, end: Date) {
    return revenueOrders
      .filter((r) => {
        const t = new Date(r.created_at).getTime();
        return t >= start.getTime() && t < end.getTime();
      })
      .reduce((s, r) => s + Number(r.total), 0);
  }
  function countInRange(start: Date, end: Date) {
    return revenueOrders.filter((r) => {
      const t = new Date(r.created_at).getTime();
      return t >= start.getTime() && t < end.getTime();
    }).length;
  }

  const revenue7 = sumInRange(sevenDaysAgo, now);
  const revenuePrev7 = sumInRange(fourteenDaysAgo, sevenDaysAgo);
  const revenueMTD = sumInRange(monthStart, now);
  const revenuePrevMonthSameDay = sumInRange(lastMonthStart, lastMonthSameDay);
  const orders7 = countInRange(sevenDaysAgo, now);
  const ordersPrev7 = countInRange(fourteenDaysAgo, sevenDaysAgo);
  const revenue30 = sumInRange(thirtyDaysAgo, now);
  const orders30 = countInRange(thirtyDaysAgo, now);
  const avgTicket30 = orders30 > 0 ? revenue30 / orders30 : 0;

  // 30-day trend, bucketed by local day. Initialize all 30 days to 0 so the
  // chart has a continuous baseline even on dates without sales.
  const dayKeys: string[] = [];
  const dayBuckets = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = addDays(today, -i);
    const key = ymd(d);
    dayKeys.push(key);
    dayBuckets.set(key, 0);
  }
  for (const r of revenueOrders) {
    const t = new Date(r.created_at);
    if (t < thirtyDaysAgo) continue;
    const key = ymd(startOfDay(t));
    if (dayBuckets.has(key)) {
      dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + Number(r.total));
    }
  }
  const trendData = dayKeys.map((day) => ({
    day,
    total: dayBuckets.get(day) ?? 0,
  }));
  const trendMax = Math.max(1, ...trendData.map((d) => d.total));

  const pendingCount = pendingResult.count ?? 0;
  const paidCount = paidResult.count ?? 0;
  const readyCount = readyResult.count ?? 0;
  const profileCount = profilesCountResult.count ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Resumen general del estado de la tienda.
        </p>
      </div>

      <section className="space-y-2.5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Necesita acción
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <ActionCard
            icon={Wallet}
            label="Por pagar"
            count={pendingCount}
            description="Esperando que el cliente complete el pago."
            href="/admin/pedidos?status=pending"
            tone="amber"
          />
          <ActionCard
            icon={Package}
            label="Por producir"
            count={paidCount}
            description="Pagados, pendientes de entrar a producción."
            href="/admin/pedidos?status=paid"
            tone="blue"
          />
          <ActionCard
            icon={Truck}
            label="Listos"
            count={readyCount}
            description="Producción terminada, esperando despacho o recolección."
            href="/admin/pedidos?status=ready"
            tone="emerald"
          />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Ingresos · últimos 7 días"
          value={formatMXN(revenue7)}
          delta={pctDelta(revenue7, revenuePrev7)}
          comparison="vs. 7 días previos"
        />
        <KpiCard
          label="Ingresos del mes"
          value={formatMXN(revenueMTD)}
          delta={pctDelta(revenueMTD, revenuePrevMonthSameDay)}
          comparison="vs. mismo día mes anterior"
        />
        <KpiCard
          label="Pedidos · últimos 7 días"
          value={orders7.toString()}
          delta={pctDelta(orders7, ordersPrev7)}
          comparison="vs. 7 días previos"
        />
        <KpiCard
          label="Ticket promedio · 30d"
          value={formatMXN(avgTicket30)}
          subtitle={`${orders30} pedidos · ${profileCount} clientes`}
        />
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Ingresos · últimos 30 días
          </h3>
          <p className="mt-1 text-2xl font-bold">{formatMXN(revenue30)}</p>
          <p className="text-xs text-muted-foreground">
            Pedidos pagados o más avanzados — excluye pendientes y cancelados.
          </p>
        </div>
        <BarChart data={trendData} max={trendMax} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <RecentOrders orders={recentOrdersResult.data ?? []} />
        <div className="space-y-4">
          <TopProductsCard items={topProducts} />
          <TopCodesCard codes={topCodes} />
        </div>
      </section>
    </div>
  );
}

// ============================================================
// Data loaders
// ============================================================

async function loadTopProducts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  since: Date,
): Promise<{ name: string; qty: number }[]> {
  // Two-step: find order ids in window (revenue statuses), then aggregate
  // their items in JS. Avoids a join + we already cache product_name on
  // order_items so renamed/deleted products still surface correctly.
  const { data: orderIds } = await supabase
    .from("orders")
    .select("id")
    .gte("created_at", since.toISOString())
    .in("status", [...REVENUE_STATUSES]);
  if (!orderIds || orderIds.length === 0) return [];
  const { data: items } = await supabase
    .from("order_items")
    .select("product_name, quantity")
    .in(
      "order_id",
      orderIds.map((o) => o.id),
    );
  if (!items) return [];
  const byName = new Map<string, number>();
  for (const it of items) {
    byName.set(
      it.product_name,
      (byName.get(it.product_name) ?? 0) + Number(it.quantity),
    );
  }
  return Array.from(byName.entries())
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);
}

async function loadTopCodes(): Promise<
  { code: string; label: string; times_used: number }[]
> {
  // `promotions` is admin-only RLS — use the service-role client.
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("promotions")
      .select("code, label, times_used")
      .gt("times_used", 0)
      .order("times_used", { ascending: false })
      .limit(3);
    return data ?? [];
  } catch (e) {
    console.error("[dashboard] failed to load top codes:", e);
    return [];
  }
}

// ============================================================
// Sub-components
// ============================================================

const TONE_CLASSES = {
  amber: "border-amber-200 bg-amber-50/60",
  blue: "border-blue-200 bg-blue-50/60",
  emerald: "border-emerald-200 bg-emerald-50/60",
} as const;

function ActionCard({
  icon: Icon,
  label,
  count,
  description,
  href,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
  description: string;
  href: string;
  tone: keyof typeof TONE_CLASSES;
}) {
  const active = count > 0;
  return (
    <Link
      href={href}
      className={cn(
        "group relative block rounded-xl border bg-card p-4 transition hover:shadow-md",
        active ? TONE_CLASSES[tone] : "border-border",
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-foreground/70" />
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </div>
      <p
        className={cn(
          "mt-2 text-3xl font-bold tabular-nums",
          !active && "text-muted-foreground/60",
        )}
      >
        {count}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      <ArrowRight className="absolute right-3 top-3 h-4 w-4 opacity-30 transition group-hover:translate-x-0.5 group-hover:opacity-90" />
    </Link>
  );
}

function KpiCard({
  label,
  value,
  delta,
  comparison,
  subtitle,
}: {
  label: string;
  value: string;
  delta?: number | null;
  comparison?: string;
  subtitle?: string;
}) {
  const hasDelta = delta !== undefined && delta !== null;
  const isPositive = hasDelta && (delta as number) >= 0;
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
      {hasDelta ? (
        <p
          className={cn(
            "mt-1 inline-flex items-center gap-1 text-xs font-medium",
            isPositive ? "text-emerald-700" : "text-rose-700",
          )}
        >
          {isPositive ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {Math.abs(delta as number).toFixed(0)}%
          {comparison ? (
            <span className="font-normal text-muted-foreground">
              {comparison}
            </span>
          ) : null}
        </p>
      ) : subtitle ? (
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      ) : delta === null ? (
        <p className="mt-1 text-xs text-muted-foreground">
          sin periodo de comparación
        </p>
      ) : null}
    </div>
  );
}

function BarChart({
  data,
  max,
}: {
  data: { day: string; total: number }[];
  max: number;
}) {
  const first = data[0]?.day;
  const mid = data[Math.floor(data.length / 2)]?.day;
  const last = data[data.length - 1]?.day;
  return (
    <div className="mt-4">
      <div className="flex h-32 items-end gap-px">
        {data.map((d) => {
          const heightPct = max > 0 ? (d.total / max) * 100 : 0;
          return (
            <div
              key={d.day}
              className="flex-1"
              title={`${shortDay(d.day)} · ${formatMXN(d.total)}`}
            >
              <div
                className={cn(
                  "w-full rounded-sm transition",
                  d.total > 0 ? "bg-primary" : "bg-muted",
                )}
                style={{ height: `${Math.max(2, heightPct)}%` }}
                aria-label={`${shortDay(d.day)}: ${formatMXN(d.total)}`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
        <span>{shortDay(first)}</span>
        <span>{shortDay(mid)}</span>
        <span>{last === ymd(startOfDay(new Date())) ? "Hoy" : shortDay(last)}</span>
      </div>
    </div>
  );
}

function RecentOrders({
  orders,
}: {
  orders: {
    id: string;
    status: string;
    total: number;
    created_at: string;
    fulfillment: string;
  }[];
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Pedidos recientes</CardTitle>
          <Link
            href="/admin/pedidos"
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Ver todos →
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {orders.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">
            Aún no hay pedidos.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/admin/pedidos/${o.id}`}
                  className="flex items-center justify-between gap-3 px-6 py-3 hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-medium">
                      #{o.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatOrderDate(o.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge variant={ORDER_STATUS_BADGE[o.status] ?? "muted"}>
                      {ORDER_STATUS_LABEL[o.status] ?? o.status}
                    </Badge>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatMXN(Number(o.total))}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function TopProductsCard({ items }: { items: { name: string; qty: number }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top productos · 30d</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin ventas en los últimos 30 días.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((p, i) => (
              <li
                key={p.name}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {i + 1}.
                  </span>
                  <span className="truncate font-medium">{p.name}</span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {p.qty} {p.qty === 1 ? "ud" : "uds"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function TopCodesCard({
  codes,
}: {
  codes: { code: string; label: string; times_used: number }[];
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Códigos canjeados</CardTitle>
          <Link
            href="/admin/codigos"
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Ver todos →
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {codes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ningún código se ha canjeado aún.
          </p>
        ) : (
          <ul className="space-y-2">
            {codes.map((c) => (
              <li
                key={c.code}
                className="flex items-baseline justify-between gap-3"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="font-mono text-xs font-semibold uppercase tracking-wide">
                    {c.code}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {c.label}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-medium tabular-nums">
                  {c.times_used} usos
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// Helpers
// ============================================================

function ymd(d: Date): string {
  // Local-date YYYY-MM-DD key so bucketing works in the user's timezone
  // (not UTC, which would shift evening orders into the next day).
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function shortDay(key?: string): string {
  if (!key) return "";
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}
