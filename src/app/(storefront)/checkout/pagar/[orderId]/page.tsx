import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PaymentBrick } from "@/app/(storefront)/checkout/_components/payment-brick";
import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { formatMXN } from "@/lib/utils";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_BADGE,
} from "@/lib/order-status";

export const metadata = { title: "Continuar pago" };
export const dynamic = "force-dynamic";

type Params = Promise<{ orderId: string }>;

export default async function ResumePaymentPage({
  params,
}: {
  params: Params;
}) {
  const { orderId } = await params;
  const { supabase, user } = await requireUser();

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, total, payment_status, fulfillment, created_at")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!order) notFound();

  // If the order is already paid (or beyond), just send the user to its
  // detail page — nothing left to do here.
  if (order.status !== "pending" || order.payment_status === "approved") {
    redirect(`/mi-cuenta/pedidos/${order.id}`);
  }

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

      <div className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-lg font-semibold">Datos de pago</h2>
        <PaymentBrick
          orderId={order.id}
          total={Number(order.total)}
          publicKey={env.MERCADOPAGO_PUBLIC_KEY}
          email={user.email ?? ""}
        />
      </div>

      <Link
        href="/mi-cuenta/pedidos"
        className={buttonVariants({ variant: "outline" }) + " mt-6"}
      >
        Volver a mis pedidos
      </Link>
    </div>
  );
}
