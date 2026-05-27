import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Pago rechazado" };

type SearchParams = Promise<{ order?: string }>;

export default async function CheckoutErrorPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { order } = await searchParams;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <Card>
        <CardContent className="space-y-5 p-8 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
          <h1 className="text-2xl font-bold tracking-tight">
            El pago no se completó
          </h1>
          <p className="text-sm text-muted-foreground">
            MercadoPago canceló o rechazó el pago. Tu pedido sigue en{" "}
            <strong>pendiente</strong> en tu cuenta; puedes intentar de nuevo
            desde ahí o regresar al carrito.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            {order ? (
              <Link
                href={`/mi-cuenta/pedidos/${order}`}
                className={buttonVariants({ size: "lg" })}
              >
                Ver pedido
              </Link>
            ) : null}
            <Link
              href="/carrito"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Volver al carrito
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
