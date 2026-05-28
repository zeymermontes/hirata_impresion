import { Sparkles } from "lucide-react";
import { formatMXN } from "@/lib/utils";
import type { AppliedPromotionSnapshot } from "@/lib/promotions";

/**
 * Renders the persisted promo snapshot on an order receipt. Reads the
 * `applied_promotions` JSON column (shape: `AppliedPromotionSnapshot[]`) so
 * the receipt survives later changes to the rule definitions.
 */
export function OrderAppliedPromotions({
  applied,
}: {
  applied: AppliedPromotionSnapshot[];
}) {
  if (applied.length === 0) return null;
  return (
    <ul className="space-y-1.5">
      {applied.map((p) => (
        <li
          key={p.rule_id}
          className="flex items-start justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-xs text-emerald-900"
        >
          <span className="flex items-start gap-1.5">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="flex flex-wrap items-baseline gap-1.5">
              <span className="font-medium">{p.label}</span>
              {p.code ? (
                <span className="font-mono text-[10px] uppercase tracking-wide opacity-70">
                  ({p.code})
                </span>
              ) : null}
            </span>
          </span>
          <span className="font-semibold">
            {p.type === "free_shipping"
              ? "Envío gratis"
              : `-${formatMXN(Number(p.discount_amount))}`}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Parses the `orders.applied_promotions` JSON column into typed snapshots.
 * Defensive against legacy orders that pre-date the column (returns []).
 */
export function parseAppliedPromotions(
  value: unknown,
): AppliedPromotionSnapshot[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is AppliedPromotionSnapshot =>
      Boolean(v) &&
      typeof v === "object" &&
      typeof (v as AppliedPromotionSnapshot).label === "string" &&
      typeof (v as AppliedPromotionSnapshot).rule_id === "string",
  );
}
