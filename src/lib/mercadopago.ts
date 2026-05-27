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
