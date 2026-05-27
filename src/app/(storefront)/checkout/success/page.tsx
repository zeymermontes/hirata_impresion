import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { mpPayment } from "@/lib/mercadopago";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMXN, cn } from "@/lib/utils";

export const metadata = { title: "Pago confirmado" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  order?: string;
  payment_id?: string;
  status?: string;
  collection_id?: string;
}>;

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const { supabase, user } = await requireUser();

  if (!params.order) redirect("/mi-cuenta/pedidos");

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", params.order)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!order) redirect("/mi-cuenta/pedidos");

  // Try to verify the payment status from MercadoPago itself rather than
  // trusting the query string. Falls back gracefully if the API is slow.
  const paymentId = params.payment_id ?? params.collection_id;
  let mpStatus: string | null = params.status ?? null;
  if (paymentId) {
    try {
      const payment = await mpPayment().get({ id: paymentId });
      mpStatus = payment.status ?? mpStatus;
      // Persist what we know on the order. Use admin client because the
      // RLS policy only lets admins update orders post-creation.
      const admin = createAdminClient();
      await admin
        .from("orders")
        .update({
          payment_id: String(paymentId),
          payment_status: payment.status ?? "unknown",
          status: payment.status === "approved" ? "paid" : order.status,
        })
        .eq("id", order.id);
      // Clear the user's cart on approval.
      if (payment.status === "approved") {
        const { data: cart } = await admin
          .from("carts")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (cart) {
          await admin.from("cart_items").delete().eq("cart_id", cart.id);
        }
      }
    } catch (e) {
      console.error("[checkout/success] payment verify failed:", e);
    }
  }

  const approved = mpStatus === "approved";
  const pending = mpStatus === "pending" || mpStatus === "in_process";

  const Icon = approved
    ? CheckCircle2
    : pending
      ? Clock
      : AlertTriangle;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <Card>
        <CardContent className="space-y-5 p-8 text-center">
          <Icon
            className={cn(
              "mx-auto h-12 w-12",
              approved
                ? "text-emerald-600"
                : pending
                  ? "text-amber-600"
                  : "text-destructive",
            )}
          />
          <h1 className="text-2xl font-bold tracking-tight">
            {approved
              ? "¡Gracias por tu compra!"
              : pending
                ? "Estamos confirmando tu pago"
                : "No pudimos confirmar tu pago"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {approved
              ? "Recibimos tu pago y tu pedido entró en producción."
              : pending
                ? "MercadoPago está procesando tu pago. Te notificaremos cuando se confirme."
                : "Si crees que es un error, revisa el estado en tus pedidos o vuelve a intentar."}
          </p>

          <div className="rounded-md border border-border bg-muted/30 p-4 text-left text-sm">
            <p className="flex items-center justify-between">
              <span className="text-muted-foreground">Pedido</span>
              <code className="font-mono text-xs">{order.id.slice(0, 8)}</code>
            </p>
            <p className="mt-1 flex items-center justify-between">
              <span className="text-muted-foreground">Estado</span>
              <Badge
                variant={
                  approved
                    ? "success"
                    : pending
                      ? "warning"
                      : "destructive"
                }
              >
                {mpStatus ?? "—"}
              </Badge>
            </p>
            <p className="mt-1 flex items-center justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold">{formatMXN(Number(order.total))}</span>
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              href={`/mi-cuenta/pedidos/${order.id}`}
              className={buttonVariants({ size: "lg" })}
            >
              Ver mi pedido
            </Link>
            <Link
              href="/productos"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Seguir comprando
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
