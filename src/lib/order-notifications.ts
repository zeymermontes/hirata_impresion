import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendOrderPaidEmail,
  sendOrderShippedEmail,
  sendOrderReadyEmail,
  type BranchScheduleLine,
  type OrderEmailItem,
} from "@/lib/email";

/**
 * Each of these helpers should only be called from the code path that
 * **just** flipped the order to the corresponding status — i.e. inside
 * the `previousStatus !== newStatus` guard. The order_status_history
 * insertion alongside is what guarantees idempotency: a later path that
 * sees the order already-in-this-status won't re-call us.
 */

async function loadOrderForEmail(orderId: string) {
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select(
      "id, user_id, total, fulfillment, tracking_number, carrier, branch_id",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return null;

  const [{ data: user }, { data: profile }, { data: items }] = await Promise.all([
    admin.auth.admin.getUserById(order.user_id),
    admin
      .from("profiles")
      .select("full_name")
      .eq("id", order.user_id)
      .maybeSingle(),
    admin
      .from("order_items")
      .select("product_name, variant_name, quantity, unit_price")
      .eq("order_id", orderId),
  ]);

  const email = user?.user?.email ?? null;
  if (!email) return null;

  return {
    order,
    email,
    name: profile?.full_name ?? null,
    items: (items ?? []) as OrderEmailItem[],
  };
}

export async function notifyOrderPaid(orderId: string): Promise<void> {
  try {
    const data = await loadOrderForEmail(orderId);
    if (!data) return;
    await sendOrderPaidEmail({
      to: data.email,
      name: data.name,
      orderId: data.order.id,
      items: data.items,
      total: Number(data.order.total),
      fulfillment: data.order.fulfillment,
    });
  } catch (e) {
    console.error("[notifyOrderPaid] failed:", e);
  }
}

// Best-effort tracking URLs per Mexican carrier. The carrier key is
// lowercased before lookup, so admin can type "Estafeta", "ESTAFETA",
// etc. Unknown carriers fall through to a plain "view order" link.
const CARRIER_TRACKING_URLS: Record<string, (n: string) => string> = {
  estafeta: (n) => `https://www.estafeta.com/Tracking/searchByGet?wayBill=${n}`,
  dhl: (n) => `https://www.dhl.com/mx-es/home/tracking.html?tracking-id=${n}`,
  fedex: (n) => `https://www.fedex.com/fedextrack/?trknbr=${n}`,
  ups: (n) => `https://www.ups.com/track?tracknum=${n}`,
  paquetexpress: (n) =>
    `https://www.paquetexpress.com.mx/rastreo?guia=${n}`,
};

export async function notifyOrderShipped(orderId: string): Promise<void> {
  try {
    const data = await loadOrderForEmail(orderId);
    if (!data) return;
    const carrier = data.order.carrier;
    const trackingNumber = data.order.tracking_number;
    const trackingUrl =
      carrier && trackingNumber
        ? CARRIER_TRACKING_URLS[carrier.toLowerCase()]?.(trackingNumber) ?? null
        : null;
    await sendOrderShippedEmail({
      to: data.email,
      name: data.name,
      orderId: data.order.id,
      carrier,
      trackingNumber,
      trackingUrl,
    });
  } catch (e) {
    console.error("[notifyOrderShipped] failed:", e);
  }
}

export async function notifyOrderReady(orderId: string): Promise<void> {
  try {
    const data = await loadOrderForEmail(orderId);
    if (!data) return;
    const admin = createAdminClient();
    let branchName: string | null = null;
    let branchAddress: string | null = null;
    let branchSchedule: BranchScheduleLine[] | null = null;
    let branchHours: string | null = null;
    if (data.order.branch_id) {
      const { data: branch } = await admin
        .from("branches")
        .select("name, address, city, hours, hours_schedule")
        .eq("id", data.order.branch_id)
        .maybeSingle();
      if (branch) {
        // Prefer the structured schedule — passed through as a typed
        // array of weekday lines so the email can render it as a
        // table. Falls back to the legacy free-form `branches.hours`
        // text when the branch hasn't been migrated through admin yet.
        const { hasAnySlot, parseBranchSchedule, scheduleAsLines } =
          await import("@/lib/branch-hours");
        branchName = branch.name;
        branchAddress = `${branch.address}, ${branch.city}`;
        const schedule = parseBranchSchedule(branch.hours_schedule);
        if (hasAnySlot(schedule)) {
          branchSchedule = scheduleAsLines(schedule);
        } else {
          branchHours = branch.hours;
        }
      }
    }
    await sendOrderReadyEmail({
      to: data.email,
      name: data.name,
      orderId: data.order.id,
      branchName,
      branchAddress,
      branchSchedule,
      branchHours,
    });
  } catch (e) {
    console.error("[notifyOrderReady] failed:", e);
  }
}
