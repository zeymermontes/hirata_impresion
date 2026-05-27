"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import { Loader2, AlertTriangle } from "lucide-react";

type Props = {
  orderId: string;
  total: number;
  publicKey: string;
  email: string;
};

let mpInitialised = false;

export function PaymentBrick({ orderId, total, publicKey, email }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!mpInitialised && publicKey) {
      initMercadoPago(publicKey, { locale: "es-MX" });
      mpInitialised = true;
      // Diagnostic: log the public key prefix so it's easy to confirm which
      // set of credentials Bricks is loading. Real keys are never logged.
      const prefix = publicKey.startsWith("TEST-")
        ? "TEST"
        : publicKey.startsWith("APP_USR-")
          ? "APP_USR (prod)"
          : "unknown";
      console.info(`[mp] Bricks initialised with ${prefix} public key`);
    }
  }, [publicKey]);

  if (!publicKey) {
    return (
      <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
        Falta <code>NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY</code> en el archivo
        <code> .env.local</code>. Reinicia el servidor después de añadirla.
      </div>
    );
  }

  return (
    <div className="relative">
      {!ready ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando formulario de pago...
          </div>
        </div>
      ) : null}

      <Payment
        initialization={{
          amount: total,
          payer: {
            email,
            // Required for some payment methods (OXXO, ATM). MP expects
            // "individual" or "association"; default to individual.
            entityType: "individual",
          },
        }}
        customization={{
          // For Mexico without a wallet preference the Payment Brick supports
          // cards + cash tickets (OXXO) + ATM. `bankTransfer` and `mercadoPago`
          // need extra setup (preferenceId) and were producing warnings.
          paymentMethods: {
            creditCard: "all",
            debitCard: "all",
            ticket: "all",
            atm: "all",
          },
          visual: {
            style: { theme: "default" },
          },
        }}
        onReady={() => setReady(true)}
        onError={(err) => {
          console.error("[brick] error:", err);
          const e = err as { cause?: string; message?: string; type?: string };
          // Always show feedback when token creation fails — even if MP marks
          // it as "non_critical", from the user's perspective the click did
          // nothing, which is worse than seeing an error.
          if (e?.cause === "secure_fields_card_token_creation_failed") {
            setError(
              "El navegador no pudo enviar los datos de la tarjeta a MercadoPago. Verificamos con curl que las credenciales y la tarjeta son válidas — el problema es del lado del navegador. Causas comunes: (1) ad blocker / extensión de privacidad, (2) los campos del formulario no se llenaron correctamente, (3) algún plugin de seguridad. Prueba en ventana de incógnito sin extensiones.",
            );
            return;
          }
          if (e?.type === "non_critical") return;
          setError(
            e?.message ?? "Error en el formulario de pago. Recarga la página.",
          );
        }}
        onSubmit={async ({ formData }) => {
          setError(null);
          try {
            const res = await fetch("/api/payment/process", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...formData, order_id: orderId }),
            });
            const data = await res.json();
            if (!res.ok || !data.ok) {
              throw new Error(data.error ?? "Error procesando el pago");
            }
            router.push(
              `/checkout/success?order=${orderId}&status=${data.status ?? "pending"}&payment_id=${data.paymentId ?? ""}`,
            );
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Error inesperado";
            setError(msg);
            throw e;
          }
        }}
      />

      {error ? (
        <p className="mt-3 flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
