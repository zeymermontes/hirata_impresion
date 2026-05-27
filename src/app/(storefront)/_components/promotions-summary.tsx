import { Sparkles, AlertCircle } from "lucide-react";
import { formatMXN } from "@/lib/utils";
import type { CartPromotionsResult } from "@/lib/promotions";

/**
 * Renders the "applied promotions" + "almost there" hints used in both
 * /carrito and the checkout summary card.
 */
export function PromotionsSummary({
  result,
}: {
  result: CartPromotionsResult;
}) {
  const { applied, almost } = result;
  if (applied.length === 0 && almost.length === 0) return null;

  return (
    <div className="space-y-2">
      {applied.map((p) => (
        <div
          key={p.rule.id}
          className="flex items-start justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs"
        >
          <div className="flex items-start gap-1.5 text-emerald-900">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="font-medium">{p.rule.label}</span>
          </div>
          <span className="font-semibold text-emerald-900">
            {p.free_shipping ? "Envío gratis" : `-${formatMXN(p.discount_amount)}`}
          </span>
        </div>
      ))}

      {almost.map((p) => (
        <div
          key={p.rule.id}
          className="flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Faltan{" "}
            <strong>{formatMXN(p.missing_to_qualify ?? 0)}</strong> para{" "}
            <span className="font-medium">{p.rule.label}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
