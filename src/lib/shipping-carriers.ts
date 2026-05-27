/**
 * Common Mexican carriers and how to build a tracking URL for each.
 *
 * The match is case-insensitive and substring-based, so "DHL Express" maps to
 * the dhl handler. Carriers we don't recognise still display the guide number
 * but without a clickable link — that's fine, the customer can search it.
 */

type CarrierKey =
  | "dhl"
  | "fedex"
  | "estafeta"
  | "paquetexpress"
  | "redpack"
  | "ups"
  | "ampm"
  | "99minutos"
  | "sendex"
  | "correos";

const CARRIER_TRACKING: Record<CarrierKey, (guide: string) => string> = {
  dhl: (g) =>
    `https://www.dhl.com/mx-es/home/tracking/tracking-express.html?tracking-id=${encodeURIComponent(g)}`,
  fedex: (g) =>
    `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(g)}`,
  estafeta: (g) =>
    `https://www.estafeta.com/Herramientas/Rastreo?wayBill=${encodeURIComponent(g)}`,
  paquetexpress: (g) =>
    `https://www.paquetexpress.com.mx/rastreo/${encodeURIComponent(g)}`,
  redpack: (g) =>
    `https://www.redpack.com.mx/rastreo/?guia=${encodeURIComponent(g)}`,
  ups: (g) =>
    `https://www.ups.com/track?tracknum=${encodeURIComponent(g)}`,
  ampm: (g) => `https://ampmexpress.com.mx/rastreo/${encodeURIComponent(g)}`,
  "99minutos": (g) =>
    `https://app.99minutos.com/seguimiento/${encodeURIComponent(g)}`,
  sendex: (g) => `https://www.sendex.mx/index.php/rastreo?guia=${encodeURIComponent(g)}`,
  correos: (g) =>
    `https://www.correosdemexico.gob.mx/SSLServicios/SeguimientoCorreos/ResumenWeb.aspx?numero=${encodeURIComponent(g)}`,
};

export const COMMON_CARRIERS = [
  "DHL",
  "FedEx",
  "Estafeta",
  "Paquetexpress",
  "Redpack",
  "UPS",
  "AMPM",
  "99 minutos",
  "Sendex",
  "Correos de México",
];

export function getTrackingUrl(
  carrier: string | null | undefined,
  guide: string | null | undefined,
): string | null {
  if (!carrier || !guide) return null;
  const normalised = carrier.toLowerCase().replace(/\s+/g, "");
  for (const key of Object.keys(CARRIER_TRACKING) as CarrierKey[]) {
    if (normalised.includes(key)) {
      return CARRIER_TRACKING[key](guide);
    }
  }
  return null;
}
