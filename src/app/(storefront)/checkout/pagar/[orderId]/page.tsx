import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PaymentBrick } from "@/app/(storefront)/checkout/_components/payment-brick";
import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { getPendingVoucher } from "@/lib/mercadopago";
import { cn, formatMXN } from "@/lib/utils";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_BADGE,
} from "@/lib/order-status";

export const metadata = { title: "Continuar pago" };
export const dynamic = "force-dynamic";

type Params = Promise<{ orderId: string }>;
type SearchParams = Promise<{ nuevo?: string }>;

export default async function ResumePaymentPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { orderId } = await params;
  const { nuevo } = await searchParams;
  const { supabase, user } = await requireUser();

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, status, total, payment_status, payment_id, fulfillment, created_at",
    )
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!order) notFound();

  // If the order is already paid (or beyond), just send the user to its
  // detail page — nothing left to do here.
  if (order.status !== "pending" || order.payment_status === "approved") {
    redirect(`/mi-cuenta/pedidos/${order.id}`);
  }

  // Default behaviour: surface the existing voucher (if any) instead of
  // creating a fresh Brick. Customer opts in to picking a different method
  // via `?nuevo=1`.
  const voucher = !nuevo
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
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href={`/mi-cuenta/pedidos/${order.id}`}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Volver al pedido
      </Link>

      <h1 className="mt-3 text-3xl font-bold tracking-tight">Continuar pago</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Estás retomando el pago de un pedido que dejaste pendiente.
      </p>

      <Card className="mt-6">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Pedido</p>
              <code className="font-mono text-sm">#{order.id.slice(0, 8)}</code>
            </div>
            <Badge variant={ORDER_STATUS_BADGE[order.status] ?? "muted"}>
              {ORDER_STATUS_LABEL[order.status] ?? order.status}
            </Badge>
          </div>
          <div className="flex items-baseline justify-between border-t border-border pt-3">
            <span className="text-sm text-muted-foreground">Total a pagar</span>
            <span className="text-2xl font-bold">
              {formatMXN(Number(order.total))}
            </span>
          </div>
        </CardContent>
      </Card>

      {voucher ? (
        <div className="mt-6 space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-2 text-amber-900">
            <FileText className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">
                {isBankTransfer
                  ? "Completa tu transferencia"
                  : "Termina tu pago en efectivo"}
              </p>
              <p className="text-sm text-amber-800">
                {isBankTransfer
                  ? "Usa los datos del comprobante para hacer el SPEI desde tu banca."
                  : "Lleva el comprobante a la sucursal para completar el pago."}
              </p>
            </div>
          </div>

          {voucher.ticketUrl ? (
            <a
              href={voucher.ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ size: "lg" }), "w-full gap-2")}
            >
              <FileText className="h-4 w-4" />
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
            ¿Cambiaste de opinión?{" "}
            <Link
              href={`/checkout/pagar/${order.id}?nuevo=1`}
              className="font-medium underline"
            >
              Elige otro método de pago
            </Link>
          </p>
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-lg font-semibold">Datos de pago</h2>
          <PaymentBrick
            orderId={order.id}
            total={Number(order.total)}
            publicKey={env.MERCADOPAGO_PUBLIC_KEY}
            email={user.email ?? ""}
          />
        </div>
      )}

      <Link
        href="/mi-cuenta/pedidos"
        className={buttonVariants({ variant: "outline" }) + " mt-6"}
      >
        Volver a mis pedidos
      </Link>
    </div>
  );
}
