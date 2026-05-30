"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { runAction } from "@/lib/server-action";
import {
  issueGiftCardsForPaidOrder,
  redeemPendingGiftCardForOrder,
} from "@/lib/gift-cards-server";

const ORDER_STATUSES = [
  "pending",
  "paid",
  "in_production",
  "ready",
  "shipped",
  "delivered",
  "cancelled",
] as const;

const StatusUpdateSchema = z
  .object({
    status: z.enum(ORDER_STATUSES),
    tracking_number: z.string().trim().optional().nullable(),
    carrier: z.string().trim().optional().nullable(),
  })
  .refine(
    (v) =>
      v.status !== "shipped" ||
      (v.tracking_number && v.tracking_number.length > 0 && v.carrier && v.carrier.length > 0),
    {
      message:
        "Para marcar 'En camino' debes ingresar el número de guía y la paquetería",
      path: ["tracking_number"],
    },
  );

export type OrderActionState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
  ok?: boolean;
};

export async function updateOrderStatusAction(
  orderId: string,
  _prev: OrderActionState | undefined,
  formData: FormData,
): Promise<OrderActionState> {
  return runAction(async () => {
    const parsed = StatusUpdateSchema.safeParse({
      status: formData.get("status"),
      tracking_number: formData.get("tracking_number") || null,
      carrier: formData.get("carrier") || null,
    });
    if (!parsed.success) {
      return { errors: z.flattenError(parsed.error).fieldErrors };
    }

    const { supabase, user } = await requireAdmin();

    // Capture the previous status BEFORE we mutate so we can detect the
    // pending → paid transition and audit the change with the right
    // from_status.
    const { data: prev } = await supabase
      .from("orders")
      .select("status, payment_status")
      .eq("id", orderId)
      .maybeSingle();
    const previousStatus = prev?.status ?? null;

    // Only persist tracking fields if status is shipped/delivered. Otherwise
    // clear them — moving an order back to "in_production" shouldn't leave
    // stale tracking data visible to the customer.
    const keepsTracking =
      parsed.data.status === "shipped" || parsed.data.status === "delivered";
    const update: {
      status: (typeof ORDER_STATUSES)[number];
      tracking_number?: string | null;
      carrier?: string | null;
      payment_status?: string;
    } = { status: parsed.data.status };
    if (keepsTracking) {
      update.tracking_number = parsed.data.tracking_number ?? null;
      update.carrier = parsed.data.carrier ?? null;
    } else {
      update.tracking_number = null;
      update.carrier = null;
    }
    // When the admin flips to 'paid' manually, also flip the MP payment
    // status — otherwise the order would still look "pending payment" in
    // the customer's view.
    const becomingPaid =
      parsed.data.status === "paid" && previousStatus !== "paid";
    if (becomingPaid && prev?.payment_status !== "approved") {
      update.payment_status = "approved";
    }

    const { error } = await supabase
      .from("orders")
      .update(update)
      .eq("id", orderId);
    if (error) return { message: error.message };

    // Audit log: who flipped the status and from where. recordOrderStatusChange
    // reads the *current* status, but we already updated it — pass the
    // previous status via a quick admin-side fetch is overkill, so just
    // insert directly here.
    if (previousStatus !== parsed.data.status) {
      await supabase.from("order_status_history").insert({
        order_id: orderId,
        from_status: previousStatus,
        to_status: parsed.data.status,
        changed_by_user_id: user.id,
        source: "admin",
      });
    }

    // If we just promoted the order to paid, run the gift-card pipeline:
    // redeem any reserved card, issue new ones, send buyer confirmation.
    // All idempotent so re-running is safe.
    if (becomingPaid) {
      try {
        await redeemPendingGiftCardForOrder(orderId);
      } catch (e) {
        console.error("[admin/pedidos] redeem failed:", e);
      }
      try {
        await issueGiftCardsForPaidOrder(orderId);
      } catch (e) {
        console.error("[admin/pedidos] issuance failed:", e);
      }
    }

    revalidatePath("/admin/pedidos");
    revalidatePath(`/admin/pedidos/${orderId}`);
    revalidatePath("/mi-cuenta/pedidos");
    revalidatePath(`/mi-cuenta/pedidos/${orderId}`);
    return { ok: true, message: "Estado actualizado." };
  });
}

const NoteSchema = z.object({
  notes: z.string().max(2000).optional().nullable(),
});

export async function updateOrderNotesAction(
  orderId: string,
  _prev: OrderActionState | undefined,
  formData: FormData,
): Promise<OrderActionState> {
  return runAction(async () => {
    const parsed = NoteSchema.safeParse({ notes: formData.get("notes") || null });
    if (!parsed.success) {
      return { message: "Nota inválida" };
    }
    const { supabase } = await requireAdmin();
    const { error } = await supabase
      .from("orders")
      .update({ notes: parsed.data.notes ?? null })
      .eq("id", orderId);
    if (error) return { message: error.message };

    revalidatePath(`/admin/pedidos/${orderId}`);
    return { ok: true, message: "Nota guardada." };
  });
}
