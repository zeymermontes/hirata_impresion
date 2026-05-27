import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import type { OrderStatus } from "@/lib/supabase/database.types";
import { cn, formatMXN } from "@/lib/utils";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_BADGE,
  formatOrderDate,
} from "@/lib/order-status";

export const metadata = { title: "Pedidos" };
export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  user_id: string;
  status: string;
  total: number;
  fulfillment: string;
  payment_status: string | null;
  created_at: string;
};

type SearchParams = Promise<{ status?: string }>;

const STATUS_TABS: Array<{ value: string; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendientes" },
  { value: "paid", label: "Pagados" },
  { value: "in_production", label: "En producción" },
  { value: "ready", label: "Listos" },
  { value: "shipped", label: "Enviados" },
  { value: "delivered", label: "Entregados" },
  { value: "cancelled", label: "Cancelados" },
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { status } = await searchParams;
  const activeFilter = status && status !== "all" ? status : null;

  const { supabase } = await requireAdmin();

  let query = supabase
    .from("orders")
    .select(
      "id, user_id, status, total, fulfillment, payment_status, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (activeFilter) query = query.eq("status", activeFilter as OrderStatus);

  const { data: rawOrders } = await query;
  const orders = (rawOrders ?? []) as OrderRow[];

  // Look up customer names in one batch. We could join via PostgREST but our
  // hand-typed Database doesn't expose Relationships, so a second query is
  // simpler than fighting the types here.
  const userIds = Array.from(new Set(orders.map((o) => o.user_id)));
  let profilesById = new Map<string, { full_name: string | null }>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);
    profilesById = new Map(
      (profiles ?? []).map((p) => [p.id, { full_name: p.full_name }]),
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Pedidos"
        description="Todos los pedidos hechos por los clientes."
      />

      <div className="flex flex-wrap gap-1 border-b border-border pb-2">
        {STATUS_TABS.map((tab) => {
          const isActive =
            (tab.value === "all" && !activeFilter) ||
            tab.value === activeFilter;
          return (
            <Link
              key={tab.value}
              href={
                tab.value === "all"
                  ? "/admin/pedidos"
                  : `/admin/pedidos?status=${tab.value}`
              }
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition",
                isActive
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title={
            activeFilter
              ? `No hay pedidos ${ORDER_STATUS_LABEL[activeFilter]?.toLowerCase() ?? activeFilter}`
              : "Aún no hay pedidos"
          }
          description={
            activeFilter
              ? "Cambia de filtro para ver los demás."
              : "Cuando un cliente complete una compra aparecerá aquí."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Entrega</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => {
                const profile = profilesById.get(o.user_id);
                return (
                  <TableRow key={o.id}>
                    <TableCell>
                      <code className="font-mono text-xs">
                        #{o.id.slice(0, 8)}
                      </code>
                    </TableCell>
                    <TableCell className="text-sm">
                      {profile?.full_name ?? (
                        <span className="text-muted-foreground italic">
                          (sin nombre)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatOrderDate(o.created_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {o.fulfillment === "ship" ? "Envío" : "Recoger"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatMXN(Number(o.total))}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ORDER_STATUS_BADGE[o.status] ?? "muted"}>
                        {ORDER_STATUS_LABEL[o.status] ?? o.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {o.payment_status ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/admin/pedidos/${o.id}`}
                        className="text-xs font-medium hover:text-primary"
                      >
                        Ver →
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
