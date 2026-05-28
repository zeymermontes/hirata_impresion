import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Store,
  Truck,
  CreditCard,
  ExternalLink,
  FileText,
  Package,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getPendingVoucher } from "@/lib/mercadopago";
import { cn, formatMXN } from "@/lib/utils";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_BADGE,
  formatOrderDate,
} from "@/lib/order-status";
import { getTrackingUrl } from "@/lib/shipping-carriers";
import {
  OrderAppliedPromotions,
  parseAppliedPromotions,
} from "@/app/(storefront)/_components/order-promotions";

export const metadata = { title: "Pedido" };
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

type OrderItem = {
  id: string;
  product_name: string;
  variant_name: string | null;
  quantity: number;
  unit_price: number;
  customization: unknown;
  uploaded_file_url: string | null;
};

export default async function OrderDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!order) notFound();

  const { data: rawItems } = await supabase
    .from("order_items")
    .select(
      "id, product_name, variant_name, quantity, unit_price, customization, uploaded_file_url",
    )
    .eq("order_id", id);
  const items = (rawItems ?? []) as OrderItem[];

  let branchInfo: { name: string; address: string; city: string } | null = null;
  if (order.branch_id) {
    const { data: branch } = await supabase
      .from("branches")
      .select("name, address, city")
      .eq("id", order.branch_id)
      .maybeSingle();
    branchInfo = branch ?? null;
  }

  const addr = order.address_snapshot as Record<string, string> | null;
  const canResumePayment =
    order.status === "pending" && order.payment_status !== "approved";
  const voucher = canResumePayment
    ? await getPendingVoucher(order.payment_id ?? null)
    : null;
  const voucherExpiresAt = voucher?.expirationDate
    ? new Date(voucher.expirationDate).toLocaleString("es-MX", {
        dateStyle: "long",
        timeStyle: "short",
      })
    : null;
  const isBankTransfer =
    voucher?.paymentMethodId === "pse" ||
    voucher?.paymentMethodId === "bank_transfer" ||
    voucher?.paymentMethodId === "spei";

  return (
    <div className="space-y-4">
      <Link
        href="/mi-cuenta/pedidos"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Volver a mis pedidos
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            Pedido #{order.id.slice(0, 8)}
          </h2>
          <p className="text-sm text-muted-foreground">
            {formatOrderDate(order.created_at)}
          </p>
        </div>
        <Badge variant={ORDER_STATUS_BADGE[order.status] ?? "muted"}>
          {ORDER_STATUS_LABEL[order.status] ?? order.status}
        </Badge>
      </header>

      {canResumePayment && voucher ? (
        <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm">
          <div className="flex items-start gap-2 text-amber-900">
            <FileText className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">
                {isBankTransfer
                  ? "Completa tu transferencia"
                  : "Termina tu pago en efectivo"}
              </p>
              <p className="text-amber-800">
                {isBankTransfer
                  ? "Tu pedido queda apartado mientras hacemos match del SPEI. Usa los datos del comprobante."
                  : "Tu pedido queda apartado mientras pagas. Confirmamos al recibir el comprobante."}
              </p>
            </div>
          </div>

          {voucher.ticketUrl ? (
            <a
              href={voucher.ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ size: "sm" }), "w-full gap-2 sm:w-auto")}
            >
              <FileText className="h-3.5 w-3.5" />
              {isBankTransfer
                ? "Ver datos de transferencia"
                : "Abrir comprobante de pago"}
            </a>
          ) : null}

          {voucher.barcodeContent ? (
            <div className="space-y-1">
              <p className="text-xs font-medium text-amber-900">
                Código de referencia
              </p>
              <code className="block w-full break-all rounded-md border border-amber-300 bg-white px-3 py-2 font-mono text-xs">
                {voucher.barcodeContent}
              </code>
            </div>
          ) : null}

          {voucherExpiresAt ? (
            <p className="text-xs text-amber-900">
              <strong>Vence:</strong> {voucherExpiresAt}
            </p>
          ) : null}

          <p className="text-xs text-amber-800">
            ¿Prefieres otro método?{" "}
            <Link
              href={`/checkout/pagar/${order.id}?nuevo=1`}
              className="font-medium underline"
            >
              Elige otro método de pago
            </Link>
          </p>
        </div>
      ) : canResumePayment ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm">
          <div className="flex items-start gap-2 text-amber-900">
            <CreditCard className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Este pedido está pendiente de pago</p>
              <p className="text-amber-800">
                Termina el pago para que entre en producción.
              </p>
            </div>
          </div>
          <Link
            href={`/checkout/pagar/${order.id}`}
            className={cn(buttonVariants({ size: "sm" }), "shrink-0 gap-1")}
          >
            <CreditCard className="h-3.5 w-3.5" />
            Continuar pago
          </Link>
        </div>
      ) : null}

      <Card>
        <CardContent className="space-y-3 p-4 sm:p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Artículos
          </h3>
          <ul className="divide-y divide-border">
            {items.map((i) => (
              <li key={i.id} className="flex items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium break-words">{i.product_name}</p>
                  {i.variant_name ? (
                    <p className="text-xs text-muted-foreground">
                      {i.variant_name}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {i.quantity} × {formatMXN(Number(i.unit_price))}
                  </p>
                  {i.uploaded_file_url ? (
                    <a
                      href={i.uploaded_file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-xs text-primary hover:underline"
                    >
                      Ver archivo subido
                    </a>
                  ) : null}
                  {i.customization &&
                  typeof i.customization === "object" &&
                  Object.keys(i.customization).length > 0 ? (
                    <CustomizationSummary
                      data={i.customization as Record<string, unknown>}
                    />
                  ) : null}
                </div>
                <p className="font-semibold">
                  {formatMXN(Number(i.unit_price) * Number(i.quantity))}
                </p>
              </li>
            ))}
          </ul>
          {(() => {
            const appliedPromos = parseAppliedPromotions(
              order.applied_promotions,
            );
            const discount = Number(order.discount_amount ?? 0);
            return (
              <div className="space-y-2 border-t border-border pt-3 text-sm">
                {appliedPromos.length > 0 ? (
                  <OrderAppliedPromotions applied={appliedPromos} />
                ) : null}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatMXN(Number(order.subtotal))}</span>
                  </div>
                  {discount > 0 ? (
                    <div className="flex justify-between text-emerald-700">
                      <span>Descuentos</span>
                      <span className="font-medium">-{formatMXN(discount)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Envío</span>
                    <span>{formatMXN(Number(order.shipping_cost))}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                    <span>Total</span>
                    <span>{formatMXN(Number(order.total))}</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4 text-sm sm:p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Entrega
          </h3>
          {order.fulfillment === "ship" && addr ? (
            <div className="flex items-start gap-3">
              <Truck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="font-medium">Envío a domicilio</p>
                <p className="break-words text-muted-foreground">
                  {addr.recipient} — {addr.street} {addr.ext_number ?? ""}
                  {addr.neighborhood ? `, ${addr.neighborhood}` : ""},{" "}
                  {addr.zip} {addr.city}, {addr.state}
                </p>
              </div>
            </div>
          ) : branchInfo ? (
            <div className="flex items-start gap-3">
              <Store className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="font-medium">
                  Recoger en {branchInfo.name}
                </p>
                <p className="break-words text-muted-foreground">
                  {branchInfo.address}, {branchInfo.city}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">—</p>
          )}
        </CardContent>
      </Card>

      {order.tracking_number && order.carrier ? (
        <TrackingCard
          carrier={order.carrier}
          trackingNumber={order.tracking_number}
          status={order.status}
        />
      ) : null}

      <Card>
        <CardContent className="space-y-1 p-4 text-sm sm:p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Pago
          </h3>
          <p>
            <span className="text-muted-foreground">Proveedor:</span>{" "}
            {order.payment_provider ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Estado del pago:</span>{" "}
            {order.payment_status ?? "—"}
          </p>
          {order.payment_id ? (
            <p className="break-all font-mono text-xs text-muted-foreground">
              ID: {order.payment_id}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function TrackingCard({
  carrier,
  trackingNumber,
  status,
}: {
  carrier: string;
  trackingNumber: string;
  status: string;
}) {
  const trackingUrl = getTrackingUrl(carrier, trackingNumber);
  const inTransit = status === "shipped";
  return (
    <Card>
      <CardContent className="space-y-3 p-4 text-sm sm:p-6">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {inTransit ? "Tu pedido está en camino" : "Información de envío"}
          </h3>
        </div>
        <div className="grid gap-1">
          <p>
            <span className="text-muted-foreground">Paquetería:</span>{" "}
            <span className="font-medium">{carrier}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Número de guía:</span>{" "}
            <span className="font-mono">{trackingNumber}</span>
          </p>
        </div>
        {trackingUrl ? (
          <a
            href={trackingUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Rastrear envío en {carrier}
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <p className="text-xs text-muted-foreground">
            Copia el número de guía y búscalo en el sitio de {carrier}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function CustomizationSummary({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(([, v]) => {
    if (v === null || v === undefined) return false;
    if (typeof v === "string") return v.length > 0;
    return true;
  });
  if (entries.length === 0) return null;
  return (
    <dl className="mt-2 grid gap-1 rounded-md bg-muted/30 p-2 text-xs">
      {entries.map(([key, value]) => {
        if (key.endsWith("__url")) {
          return (
            <div key={key} className="flex gap-1.5">
              <dt className="text-muted-foreground capitalize">
                {key.slice(0, -"__url".length)}:
              </dt>
              <dd>
                <a
                  href={String(value)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  Ver archivo
                </a>
              </dd>
            </div>
          );
        }
        return (
          <div key={key} className="flex min-w-0 gap-1.5">
            <dt className="shrink-0 text-muted-foreground capitalize">
              {key}:
            </dt>
            <dd className="min-w-0 flex-1 truncate">{String(value)}</dd>
          </div>
        );
      })}
    </dl>
  );
}
