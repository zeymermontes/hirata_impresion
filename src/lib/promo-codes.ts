import type {
  DiscountType,
  PromotionRuleType,
} from "@/lib/supabase/database.types";
import type {
  AppliedPromotionSnapshot,
  EvaluatedPromotion,
} from "@/lib/promotions";

// ============================================================
// Types (client-safe — server-only helpers live in `promo-codes-server.ts`)
// ============================================================

export type PromoCode = {
  id: string;
  code: string;
  label: string;
  description: string | null;
  discount_type: DiscountType;
  value: number;
  min_subtotal: number | null;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  times_used: number;
  active: boolean;
};

export type PromoCodeValidation =
  | { ok: true; promo: PromoCode }
  | { ok: false; message: string };

// ============================================================
// Pure evaluation
// ============================================================

/**
 * Map a `promotions.discount_type` to the normalized `PromotionRuleType`
 * used by the snapshot persistence layer. This keeps the receipt rendering
 * code agnostic to whether the discount came from a code or an auto rule.
 */
function discountTypeToRuleType(t: DiscountType): PromotionRuleType {
  if (t === "percent") return "percent_off";
  if (t === "amount") return "amount_off";
  return "free_shipping";
}

/**
 * Apply a (already-validated) code to the cart subtotal + shipping. Returns
 * the same `EvaluatedPromotion` shape used by the auto-rule engine so the
 * UI can render both kinds together.
 */
export function evaluatePromoCode(
  promo: PromoCode,
  cartSubtotal: number,
  shippingCost: number,
): EvaluatedPromotion {
  let discount = 0;
  let freeShipping = false;
  if (promo.discount_type === "free_shipping") {
    freeShipping = true;
    discount = shippingCost;
  } else if (promo.discount_type === "percent") {
    discount = round2(cartSubtotal * (promo.value / 100));
  } else if (promo.discount_type === "amount") {
    discount = Math.min(promo.value, cartSubtotal);
  }
  return {
    rule: {
      id: promo.id,
      name: promo.code,
      label: promo.label,
      description: promo.description,
      type: discountTypeToRuleType(promo.discount_type),
      discount_value: promo.value,
      min_subtotal: promo.min_subtotal,
      buy_x: null,
      scope: "all",
      starts_at: promo.starts_at,
      ends_at: promo.ends_at,
      sort_order: 0,
      active: promo.active,
      product_ids: [],
      category_ids: [],
    },
    qualified: true,
    discount_amount: discount,
    free_shipping: freeShipping,
  };
}

/**
 * Snapshot a code application for persistence on the order. Same shape as
 * the rule snapshot but with the `code` field set so receipts can show
 * "Código: XYZ".
 */
export function snapshotCodeApplication(
  promo: PromoCode,
  evaluated: EvaluatedPromotion,
): AppliedPromotionSnapshot {
  return {
    rule_id: promo.id,
    label: promo.label,
    type: discountTypeToRuleType(promo.discount_type),
    discount_amount: evaluated.discount_amount,
    code: promo.code,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ============================================================
// Display helpers
// ============================================================

export const DISCOUNT_TYPE_LABEL: Record<DiscountType, string> = {
  percent: "% de descuento",
  amount: "Descuento fijo",
  free_shipping: "Envío gratis",
};
