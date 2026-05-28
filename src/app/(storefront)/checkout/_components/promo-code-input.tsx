"use client";

import { useState, useTransition } from "react";
import { Ticket, X, Loader2, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { validatePromoCodeAction } from "@/app/(storefront)/checkout/actions";
import type { PromoCode } from "@/lib/promo-codes";
import { cn } from "@/lib/utils";

export type AppliedCode = {
  promo: PromoCode;
  /** Pesos discounted from the order by this code. */
  discount_amount: number;
  free_shipping: boolean;
};

type Props = {
  cartSubtotal: number;
  shippingCost: number;
  applied: AppliedCode | null;
  onApply: (a: AppliedCode) => void;
  onRemove: () => void;
};

export function PromoCodeInput({
  cartSubtotal,
  shippingCost,
  applied,
  onApply,
  onRemove,
}: Props) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!code.trim() || pending) return;
    startTransition(async () => {
      setError(null);
      const result = await validatePromoCodeAction({
        code: code.trim(),
        cart_subtotal: cartSubtotal,
        shipping_cost: shippingCost,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onApply({
        promo: result.promo,
        discount_amount: result.discount_amount,
        free_shipping: result.free_shipping,
      });
      setCode("");
    });
  }

  if (applied) {
    return (
      <div className="flex items-start justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs">
        <div className="flex items-start gap-2 text-emerald-900">
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-mono text-sm font-semibold uppercase tracking-wide">
              {applied.promo.code}
            </p>
            <p>{applied.promo.label}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-emerald-900 hover:bg-emerald-100"
          aria-label="Quitar código"
        >
          <X className="h-3.5 w-3.5" />
          Quitar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label
        htmlFor="promo-code-input"
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
      >
        <Ticket className="h-3.5 w-3.5" />
        ¿Tienes un código?
      </label>
      <div className="flex gap-2">
        <Input
          id="promo-code-input"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Escribe tu código"
          className={cn(
            "font-mono uppercase tracking-wide",
            error && "border-destructive focus-visible:border-destructive",
          )}
          autoCapitalize="characters"
          autoComplete="off"
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={submit}
          disabled={pending || !code.trim()}
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            "Aplicar"
          )}
        </Button>
      </div>
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
