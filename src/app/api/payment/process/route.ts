import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mpPayment } from "@/lib/mercadopago";

/**
 * Processes a payment submitted by the MercadoPago Payment Brick.
 *
 * Body shape: the brick's `formData` (token, payment_method_id, payer,
 * transaction_amount, etc.) plus an `order_id` we add client-side so we know
 * which order this payment belongs to.
 *
 * Security:
 *  - Verify the order exists and belongs to the authenticated user.
 *  - Verify the amount matches the server-side order total — otherwise a
 *    malicious client could tamper with the brick's amount.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderId = typeof body.order_id === "string" ? body.order_id : null;
  if (!orderId) {
    return NextResponse.json({ error: "Missing order_id" }, { status: 400 });
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, total, status, payment_status")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.status !== "pending") {
    return NextResponse.json(
      { error: "Order already processed", status: order.status },
      { status: 409 },
    );
  }

  const orderTotal = Number(order.total);
  const submittedAmount = Number(body.transaction_amount);
  if (
    !Number.isFinite(submittedAmount) ||
    Math.abs(submittedAmount - orderTotal) > 0.01
  ) {
    return NextResponse.json(
      { error: "Amount mismatch" },
      { status: 400 },
    );
  }

  // Build the MP Payment payload. We trust the brick to send the right shape
  // for the chosen payment method (card token, payer info, etc.).
  const paymentBody = {
    ...(body as Record<string, unknown>),
    transaction_amount: orderTotal,
    external_reference: orderId,
    description: `Hirata pedido ${orderId.slice(0, 8)}`,
    metadata: { order_id: orderId, user_id: user.id },
  };
  // Strip our own field that MP doesn't expect.
  delete (paymentBody as Record<string, unknown>).order_id;

  let mpResult;
  try {
    mpResult = await mpPayment().create({
      body: paymentBody,
      requestOptions: {
        // Idempotency: if the user double-submits we don't double-charge.
        idempotencyKey: `order-${orderId}`,
      },
    });
  } catch (e: unknown) {
    const errorObj = e as { message?: string; cause?: { error?: string }; status?: number };
    console.error("[mp] payment create failed:", e);
    return NextResponse.json(
      {
        error:
          errorObj?.cause?.error ??
          errorObj?.message ??
          "MercadoPago rejected the payment",
        status: errorObj?.status ?? 502,
      },
      { status: 502 },
    );
  }

  // Persist the result. Use the admin client because orders.update has an
  // is_admin() RLS policy — the customer can read their order but not update
  // payment fields directly.
  const admin = createAdminClient();
  const newStatus =
    mpResult.status === "approved"
      ? "paid"
      : mpResult.status === "rejected"
        ? "pending"
        : "pending";

  await admin
    .from("orders")
    .update({
      payment_id: String(mpResult.id ?? ""),
      payment_status: mpResult.status ?? "unknown",
      status: newStatus,
    })
    .eq("id", orderId);

  if (mpResult.status === "approved") {
    const { data: cart } = await admin
      .from("carts")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (cart) {
      await admin.from("cart_items").delete().eq("cart_id", cart.id);
    }
  }

  return NextResponse.json({
    ok: true,
    status: mpResult.status,
    statusDetail: mpResult.status_detail,
    paymentId: mpResult.id,
    orderId,
  });
}
