import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { OrderStatus } from "@/lib/supabase/database.types";

/**
 * Source label for an `order_status_history` row. Knowing where a change
 * came from lets us debug "why did this order flip status at 2am?" without
 * crawling logs.
 */
export type OrderStatusSource =
  | "admin"
  | "mp_webhook"
  | "mp_process"
  | "checkout_success"
  | "checkout_create"
  | "system";

/**
 * Append one row to `order_status_history` describing a status transition.
 * Idempotent at the API level — if the order is already in `to_status`,
 * we skip the insert (avoids spurious duplicate rows when the same
 * webhook fires twice).
 */
export async function recordOrderStatusChange(input: {
  orderId: string;
  toStatus: OrderStatus;
  source: OrderStatusSource;
  /** Admin's auth.users.id for manual changes; NULL for system changes. */
  changedByUserId?: string | null;
  note?: string | null;
}): Promise<void> {
  const admin = createAdminClient();

  // Fetch the current status to: (a) skip if no-op, (b) capture from_status.
  const { data: order } = await admin
    .from("orders")
    .select("status")
    .eq("id", input.orderId)
    .maybeSingle();
  if (!order) return;
  // Skip the "no change" case so a webhook double-fire doesn't pollute the
  // timeline. (The actual orders.status row is also unchanged, so the
  // history would be misleading.)
  if (order.status === input.toStatus) return;

  const { error } = await admin.from("order_status_history").insert({
    order_id: input.orderId,
    from_status: order.status,
    to_status: input.toStatus,
    changed_by_user_id: input.changedByUserId ?? null,
    source: input.source,
    note: input.note ?? null,
  });
  if (error) {
    console.error("[order-history] insert failed:", error);
  }
}
