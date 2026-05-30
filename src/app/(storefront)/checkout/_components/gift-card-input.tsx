"use client";

import { useState, useTransition } from "react";
import { Gift, X, Loader2, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { validateGiftCardAction } from "@/app/(storefront)/checkout/actions";
import type { GiftCard } from "@/lib/gift-cards";
import { cn, formatMXN } from "@/lib/utils";

export type AppliedGiftCard = {
  card: GiftCard;
  /** Amount applied to the current order (capped at balance + order total). */
  applied_amount: number;
};

type Props = {
  /** The order total after rule + promo-code discounts, before gift card. */
  previewTotal: number;
  applied: AppliedGiftCard | null;
  onApply: (a: AppliedGiftCard) => void;
  onRemove: () => void;
};

export function GiftCardInput({
  previewTotal,
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
      const result = await validateGiftCardAction({
        code: code.trim(),
        preview_total: previewTotal,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      if (result.applicable_amount <= 0) {
        setError("Tu pedido ya está cubierto — no hay nada que aplicar.");
        return;
      }
      onApply({ card: result.card, applied_amount: result.applicable_amount });
      setCode("");
    });
  }

  if (applied) {
    return (
      <div className="space-y-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-mono text-sm font-semibold uppercase tracking-wide">
                {applied.card.code}
              </p>
              <p>Saldo restante: {formatMXN(applied.card.balance)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 hover:bg-emerald-100"
            aria-label="Quitar gift card"
          >
            <X className="h-3.5 w-3.5" />
            Quitar
          </button>
        </div>
        <p className="text-[11px] text-emerald-800">
          Aplicaremos {formatMXN(applied.applied_amount)} a este pedido y el
          resto queda en la gift card para próximos pedidos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label
        htmlFor="gift-card-input"
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
      >
        <Gift className="h-3.5 w-3.5" />
        ¿Tienes una gift card?
      </label>
      <div className="flex gap-2">
        <Input
          id="gift-card-input"
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
          placeholder="HIRATA-XXXX-YYYY"
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
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Aplicar"}
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
