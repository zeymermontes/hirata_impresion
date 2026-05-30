import { Clock, Sparkles, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ORDER_STATUS_BADGE,
  ORDER_STATUS_LABEL,
} from "@/lib/order-status";

type HistoryRow = {
  id: string;
  from_status: string | null;
  to_status: string;
  changed_by_user_id: string | null;
  source: string;
  note: string | null;
  created_at: string;
};

const SOURCE_LABEL: Record<string, string> = {
  admin: "Admin",
  mp_webhook: "MercadoPago (webhook)",
  mp_process: "MercadoPago",
  checkout_success: "Confirmación de pago",
  checkout_create: "Checkout",
  system: "Sistema",
};

/**
 * Renders the audit log of status transitions for one order. Reads via the
 * admin client so it works both for the customer-facing detail page (where
 * the customer can only see their own orders by user_id) and the admin
 * page. RLS on `order_status_history` still enforces "owner or admin"
 * separately.
 */
export async function OrderStatusHistory({ orderId }: { orderId: string }) {
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("order_status_history")
    .select(
      "id, from_status, to_status, changed_by_user_id, source, note, created_at",
    )
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  const history = (rows ?? []) as HistoryRow[];
  if (history.length === 0) return null;

  // Pull display names for the admins who appear in the log.
  const adminIds = Array.from(
    new Set(
      history
        .map((r) => r.changed_by_user_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const adminNames = new Map<string, string>();
  if (adminIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name")
      .in("id", adminIds);
    for (const p of profiles ?? []) {
      if (p.full_name) adminNames.set(p.id, p.full_name);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex items-center gap-2 border-b border-border px-5 py-3">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Historial de estados
        </h3>
      </header>
      <ol className="divide-y divide-border">
        {history.map((row) => {
          const isSystem = row.changed_by_user_id === null;
          const who = isSystem
            ? "Sistema"
            : (adminNames.get(row.changed_by_user_id!) ?? "Admin");
          const sourceLabel = SOURCE_LABEL[row.source] ?? row.source;
          const when = new Date(row.created_at).toLocaleString("es-MX", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
          return (
            <li
              key={row.id}
              className="flex flex-col gap-2 px-5 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-wrap items-center gap-2">
                {row.from_status ? (
                  <>
                    <Badge
                      variant={
                        ORDER_STATUS_BADGE[row.from_status] ?? "muted"
                      }
                    >
                      {ORDER_STATUS_LABEL[row.from_status] ?? row.from_status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">→</span>
                  </>
                ) : null}
                <Badge
                  variant={ORDER_STATUS_BADGE[row.to_status] ?? "muted"}
                >
                  {ORDER_STATUS_LABEL[row.to_status] ?? row.to_status}
                </Badge>
                {row.note ? (
                  <span className="text-xs text-muted-foreground">
                    · {row.note}
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {isSystem ? (
                  <Sparkles className="h-3 w-3" />
                ) : (
                  <User className="h-3 w-3" />
                )}
                <span>{who}</span>
                <span className="text-muted-foreground/60">·</span>
                <span>{sourceLabel}</span>
                <span className="text-muted-foreground/60">·</span>
                <span>{when}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
