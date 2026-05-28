"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Loader2, AlertTriangle } from "lucide-react";

// Force the Payment Brick component to load ONLY on the client. The MP SDK
// touches `window` and registers globals when imported, which fails during
// Next.js server rendering and (per MP support guidance) can also surface as
// strange CORS / preflight failures when the SDK initialises in a non-browser
// context. Wrapping with next/dynamic({ ssr: false }) guarantees the import
// only happens in the browser.
const Payment = dynamic(
  () => import("@mercadopago/sdk-react").then((m) => m.Payment),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando formulario de pago...
      </div>
    ),
  },
);

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
    if (mpInitialised || !publicKey) return;
    let cancelled = false;
    // Dynamic import so initMercadoPago is also browser-only.
    import("@mercadopago/sdk-react").then(({ initMercadoPago }) => {
      if (cancelled) return;
      initMercadoPago(publicKey, { locale: "es-MX" });
      mpInitialised = true;
      const prefix = publicKey.startsWith("TEST-")
        ? "TEST"
        : publicKey.startsWith("APP_USR-")
          ? "APP_USR (prod)"
          : "unknown";
      console.info(`[mp] Bricks initialised with ${prefix} public key`);
    });
    return () => {
      cancelled = true;
    };
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
            entityType: "individual",
          },
        }}
        customization={{
          paymentMethods: {
            creditCard: "all",
            debitCard: "all",
            ticket: "all",
            atm: "all",
            bankTransfer: "all",
            mercadoPago: "all",
          },
          visual: {
            style: {
              theme: "default",
              // The MP SDK's TS types list a narrow subset of customVariables
              // — these `form*` / `inputBackgroundColor` keys are documented
              // and work at runtime but aren't in the typings. Cast to keep
              // structural parity with the upstream fork.
              customVariables: {
                baseColor: "#facc15",
                baseColorFirstVariant: "#e1b813",
                baseColorSecondVariant: "#c8a311",
                successColor: "#10b981",
                errorColor: "#ef4444",
                outlinePrimaryColor: "#facc15",
                buttonTextColor: "#ffffff",
                borderRadiusLarge: "0.75rem",
                borderRadiusMedium: "0.5rem",
                borderRadiusSmall: "0.375rem",
                formInputsTextColor: "#0a0a0a",
                formLabelTextColor: "#0a0a0a",
                inputBackgroundColor: "#ffffff",
              } as Record<string, string>,
            },
          },
        }}
        onReady={() => setReady(true)}
        onError={(err) => {
          console.error("[brick] error:", err);
          const e = err as { cause?: string; message?: string; type?: string };
          if (e?.cause === "secure_fields_card_token_creation_failed") {
            setError(
              "MercadoPago rechazó la tokenización de la tarjeta. Posibles causas: (1) ad blocker / extensión bloqueando el iframe de MP, (2) la cuenta de MP necesita habilitar Bricks en panel, (3) limitación temporal. Prueba en incógnito sin extensiones. Si persiste, abre un ticket con MP soporte mencionando este public key.",
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
