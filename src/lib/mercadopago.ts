import "server-only";
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import { serverOnlyEnv } from "@/lib/env";

let cachedClient: MercadoPagoConfig | null = null;

function getClient() {
  if (cachedClient) return cachedClient;
  const { MERCADOPAGO_ACCESS_TOKEN } = serverOnlyEnv();
  if (!MERCADOPAGO_ACCESS_TOKEN) {
    throw new Error(
      "MERCADOPAGO_ACCESS_TOKEN is not set. Add it to your .env.local",
    );
  }
  cachedClient = new MercadoPagoConfig({
    accessToken: MERCADOPAGO_ACCESS_TOKEN,
    options: { timeout: 10_000 },
  });
  return cachedClient;
}

export function mpPreference() {
  return new Preference(getClient());
}

export function mpPayment() {
  return new Payment(getClient());
}

export type PendingVoucher = {
  ticketUrl: string | null;
  barcodeContent: string | null;
  expirationDate: string | null;
  paymentMethodId: string | null;
};

/**
 * Fetches the voucher (ticket_url, barcode) for an existing MP payment if it's
 * still pending and unexpired. Returns null if there's no payment id, the
 * payment is already approved/rejected, or the voucher has expired.
 */
export async function getPendingVoucher(
  paymentId: string | null,
): Promise<PendingVoucher | null> {
  if (!paymentId) return null;
  try {
    const payment = await mpPayment().get({ id: paymentId });
    if (payment.status !== "pending" && payment.status !== "in_process") {
      console.info(
        `[mp] voucher: payment ${paymentId} status=${payment.status}, skipping`,
      );
      return null;
    }
    // MP returns the voucher URL in different places depending on the payment
    // method / SDK version. Check all known paths.
    const txData = payment.point_of_interaction?.transaction_data as
      | { ticket_url?: string; barcode?: { content?: string } }
      | undefined;
    const txDetails = payment.transaction_details as
      | { external_resource_url?: string }
      | undefined;
    const ticketUrl =
      txData?.ticket_url ?? txDetails?.external_resource_url ?? null;
    const barcodeContent = txData?.barcode?.content ?? null;
    if (!ticketUrl && !barcodeContent) {
      console.info(
        `[mp] voucher: payment ${paymentId} method=${payment.payment_method_id} type=${payment.payment_type_id} has no ticket_url/barcode`,
      );
      return null;
    }
    const expirationDate = payment.date_of_expiration ?? null;
    if (expirationDate && new Date(expirationDate) < new Date()) return null;
    return {
      ticketUrl,
      barcodeContent,
      expirationDate,
      paymentMethodId: payment.payment_method_id ?? null,
    };
  } catch (e) {
    console.error("[mp] getPendingVoucher failed:", e);
    return null;
  }
}
