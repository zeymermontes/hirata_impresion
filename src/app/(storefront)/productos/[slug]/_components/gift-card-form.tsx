"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Loader2, Gift, Mail, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  addToCartAction,
  type AddToCartState,
} from "@/app/(storefront)/carrito/actions";
import { cn, formatMXN } from "@/lib/utils";

type DeliveryMethod = "email" | "physical";

type Props = {
  productId: string;
  minAmount: number;
  maxAmount: number;
  /** Pre-fill the sender/recipient when the buyer is logged in. */
  buyerEmail?: string | null;
};

// Common denominations. The "custom" path is always available.
const QUICK_AMOUNTS = [200, 500, 1000, 2000];

export function GiftCardForm({
  productId,
  minAmount,
  maxAmount,
  buyerEmail,
}: Props) {
  const [state, formAction] = useActionState<
    AddToCartState | undefined,
    FormData
  >(addToCartAction, undefined);

  const [amount, setAmount] = useState<number>(QUICK_AMOUNTS[1]); // $500 default
  const [customMode, setCustomMode] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("email");
  const [sendToSelf, setSendToSelf] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [senderName, setSenderName] = useState("");
  const [message, setMessage] = useState("");

  function pickAmount(v: number) {
    setAmount(v);
    setCustomMode(false);
  }
  function pickCustom() {
    setCustomMode(true);
  }
  function toggleSendToSelf() {
    const next = !sendToSelf;
    setSendToSelf(next);
    if (next && buyerEmail) {
      setRecipientEmail(buyerEmail);
    }
  }

  const inRange = amount >= minAmount && amount <= maxAmount;
  const recipientLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    recipientEmail.trim(),
  );
  // Email delivery requires a destination email; physical delivery uses
  // the order's shipping address, so recipient_email becomes optional.
  const recipientOk = deliveryMethod === "physical" || recipientLooksValid;
  const canSubmit = inRange && recipientOk;

  const customizationPayload = {
    gift_card: {
      amount,
      delivery_method: deliveryMethod,
      recipient_email: recipientEmail.trim() || undefined,
      recipient_name: recipientName.trim() || undefined,
      sender_name: senderName.trim() || undefined,
      message: message.trim() || undefined,
    },
  };

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="product_id" value={productId} />
      <input type="hidden" name="quantity" value={1} />
      <input
        type="hidden"
        name="customization"
        value={JSON.stringify(customizationPayload)}
      />

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Monto</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {QUICK_AMOUNTS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => pickAmount(v)}
              className={cn(
                "rounded-md border border-border px-3 py-2 text-sm font-semibold transition",
                amount === v && !customMode
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:border-primary/40",
              )}
            >
              {formatMXN(v)}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={pickCustom}
          className={cn(
            "block w-full rounded-md border border-border px-3 py-2 text-sm font-medium transition",
            customMode
              ? "border-primary bg-primary/10"
              : "text-muted-foreground hover:border-primary/40",
          )}
        >
          Otro monto
        </button>
        {customMode ? (
          <div className="grid gap-1.5 pt-1">
            <Label htmlFor="custom_amount">Monto personalizado (MXN)</Label>
            <Input
              id="custom_amount"
              type="number"
              min={minAmount}
              max={maxAmount}
              step={1}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">
              Mínimo {formatMXN(minAmount)} · máximo {formatMXN(maxAmount)}.
            </p>
            {!inRange ? (
              <p className="text-xs text-destructive">
                El monto debe estar entre {formatMXN(minAmount)} y{" "}
                {formatMXN(maxAmount)}.
              </p>
            ) : null}
          </div>
        ) : null}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">¿Cómo se entrega?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setDeliveryMethod("email")}
            className={cn(
              "flex flex-col items-start gap-1.5 rounded-md border p-3 text-left transition",
              deliveryMethod === "email"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40",
            )}
          >
            <Mail className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Por correo</p>
            <p className="text-xs text-muted-foreground">
              El destinatario recibe el código por email apenas se confirme
              tu pago. Sin costo de envío.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setDeliveryMethod("physical")}
            className={cn(
              "flex flex-col items-start gap-1.5 rounded-md border p-3 text-left transition",
              deliveryMethod === "physical"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40",
            )}
          >
            <Truck className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Tarjeta física</p>
            <p className="text-xs text-muted-foreground">
              Te enviamos una tarjeta impresa a la dirección que elijas en
              el checkout. Aplica costo de envío normal.
            </p>
          </button>
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-md border border-border bg-muted/30 p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Destinatario
        </legend>
        {buyerEmail && deliveryMethod === "email" ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={sendToSelf}
              onChange={toggleSendToSelf}
              className="h-4 w-4 rounded border-input"
            />
            Enviármela a mí mismo
          </label>
        ) : null}
        <div className="grid gap-1.5">
          <Label htmlFor="recipient_email">
            Email del destinatario
            {deliveryMethod === "physical" ? " (opcional)" : ""}
          </Label>
          <Input
            id="recipient_email"
            type="email"
            required={deliveryMethod === "email"}
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder="amiga@correo.com"
          />
          <p className="text-xs text-muted-foreground">
            {deliveryMethod === "email"
              ? "Le enviaremos la gift card por correo cuando se confirme tu pago."
              : "Opcional para nuestros registros — la tarjeta física se entrega en la dirección del checkout."}
          </p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="recipient_name">Nombre del destinatario (opcional)</Label>
          <Input
            id="recipient_name"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="Ej. Sofía"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="sender_name">Tu nombre (opcional)</Label>
          <Input
            id="sender_name"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            placeholder="Lo verá en el correo"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="message">Mensaje (opcional)</Label>
          <Textarea
            id="message"
            rows={3}
            maxLength={500}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="¡Felicidades!"
          />
          <p className="text-xs text-muted-foreground">
            Hasta 500 caracteres.
          </p>
        </div>
      </fieldset>

      {state?.message && !state.ok ? (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {state.message}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="flex items-center gap-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">
          <Check className="h-4 w-4" /> Agregado al carrito.
        </p>
      ) : null}

      <SubmitButton disabled={!canSubmit} amount={amount} />
    </form>
  );
}

function SubmitButton({
  disabled,
  amount,
}: {
  disabled: boolean;
  amount: number;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      className="w-full gap-2"
      disabled={pending || disabled}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> Agregando...
        </>
      ) : (
        <>
          <Gift className="h-4 w-4" />
          Comprar gift card de {formatMXN(amount)}
        </>
      )}
    </Button>
  );
}
