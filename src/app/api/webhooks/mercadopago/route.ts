import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { mpPayment } from "@/lib/mercadopago";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * MercadoPago notifications endpoint (a.k.a. "webhook").
 *
 * MP can call this for several event types, but we only care about
 * `payment.created` / `payment.updated`. The body just gives us the payment
 * id; we always fetch the full payment from MP's API to learn the real status
 * (don't trust the body alone — anyone could spoof it without the signature).
 *
 * For card payments, the storefront flow at /api/payment/process already sets
 * the order status synchronously after tokenization, so this webhook is
 * mostly a safety net + the only signal we get for async methods like OXXO
 * (ticket) or SPEI where the customer pays hours/days later.
 *
 * MP retries non-2xx responses, so we always return 200 unless we're explicitly
 * rejecting a request we suspect is malicious. We also need to be idempotent —
 * the same payment id may arrive several times.
 *
 * Docs: https://www.mercadopago.com.mx/developers/es/docs/your-integrations/notifications/webhooks
 */
export async function POST(req: NextRequest) {
  const url = new URL(req.url);

  let body: {
    type?: string;
    action?: string;
    data?: { id?: string | number };
  } | null = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  // Event type lives in body.type ("payment") or older query string ?type=
  const type = body?.type ?? url.searchParams.get("type");
  // Payment id lives in body.data.id ("12345") or older query string ?id=
  const rawPaymentId =
    body?.data?.id ?? url.searchParams.get("id") ?? url.searchParams.get("data.id");
  const paymentId = rawPaymentId ? String(rawPaymentId) : null;

  // Verify signature if a secret is configured. Without a secret we accept
  // unsigned requests — useful for local development, but in production set
  // MERCADOPAGO_WEBHOOK_SECRET so spoofed callbacks can't mutate orders.
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (secret) {
    const signatureHeader = req.headers.get("x-signature");
    const requestId = req.headers.get("x-request-id") ?? "";
    if (!verifySignature(signatureHeader, requestId, paymentId ?? "", secret)) {
      console.warn("[mp/webhook] signature verification failed");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 },
      );
    }
  }

  if (type !== "payment" || !paymentId) {
    // Other notification types (merchant_order, plan, subscription...) — ack
    // and move on. Returning 200 prevents MP from retrying.
    return NextResponse.json({ ok: true, ignored: true });
  }

  // Always fetch the authoritative payment record from MP.
  let payment;
  try {
    payment = await mpPayment().get({ id: paymentId });
  } catch (e) {
    const err = e as { status?: number; error?: string; message?: string };
    // 404 = the payment id doesn't exist. MP's "Simular" feature in the
    // dashboard sends a fake id (e.g. 123456) to verify reachability —
    // returning 200 here lets that check pass and avoids infinite retries.
    if (err?.status === 404 || err?.error === "not_found") {
      console.info(
        `[mp/webhook] payment ${paymentId} not found, treating as test ping`,
      );
      return NextResponse.json({ ok: true, payment_not_found: true });
    }
    console.error("[mp/webhook] could not fetch payment:", e);
    // For transient errors (5xx, network) return 500 so MP retries.
    return NextResponse.json(
      { error: "Could not fetch payment from MP" },
      { status: 500 },
    );
  }

  const orderId = payment.external_reference;
  if (!orderId) {
    // We can't link this payment to an order — probably created outside of
    // our app. Ack and ignore.
    return NextResponse.json({ ok: true, no_order: true });
  }

  const admin = createAdminClient();

  const newOrderStatus: "paid" | "cancelled" | undefined =
    payment.status === "approved"
      ? "paid"
      : payment.status === "rejected"
        ? "cancelled"
        : undefined; // pending/in_process leave the order in its current state

  const update: {
    payment_id: string;
    payment_status: string;
    status?: "paid" | "cancelled";
  } = {
    payment_id: String(payment.id),
    payment_status: payment.status ?? "unknown",
  };
  if (newOrderStatus) update.status = newOrderStatus;

  const { error } = await admin
    .from("orders")
    .update(update)
    .eq("id", orderId);
  if (error) {
    console.error("[mp/webhook] failed to update order:", error);
    return NextResponse.json({ error: "DB update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, order_id: orderId, status: payment.status });
}

// Some MP test integrations occasionally hit this with GET while validating
// reachability. Respond 200 so they mark the endpoint healthy.
export async function GET() {
  return NextResponse.json({ ok: true });
}

/**
 * Verify the signature MP sends in the `x-signature` header.
 * Header format: `ts=<timestamp>,v1=<hex-hmac>`
 * Manifest: `id:<data.id>;request-id:<x-request-id>;ts:<timestamp>;`
 * HMAC-SHA256(manifest, secret) must equal v1 (compared in constant time).
 */
function verifySignature(
  header: string | null,
  requestId: string,
  paymentId: string,
  secret: string,
): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header
      .split(",")
      .map((kv) => kv.trim().split("="))
      .filter((kv): kv is [string, string] => kv.length === 2),
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${paymentId};request-id:${requestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  // Lengths must match for timingSafeEqual; if they don't, the signature is
  // already wrong.
  if (expected.length !== v1.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(v1, "hex"));
  } catch {
    return false;
  }
}
