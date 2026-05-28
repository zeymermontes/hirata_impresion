import type {
  PromotionRuleType,
  PromotionRuleScope,
} from "@/lib/supabase/database.types";

// ============================================================
// Types
// ============================================================

export type PromotionRule = {
  id: string;
  name: string;
  label: string;
  description: string | null;
  type: PromotionRuleType;
  discount_value: number;
  min_subtotal: number | null;
  /**
   * Minimum number of *qualifying units* in the cart (counted by `scope`).
   * For `buy_x_get_y` this is X. For other types it's an optional quantity
   * gate that works alongside `min_subtotal`.
   */
  buy_x: number | null;
  scope: PromotionRuleScope;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
  active: boolean;
  product_ids: string[];
  category_ids: string[];
};

export type CartItemForPromo = {
  product_id: string;
  category_id: string | null;
  /** category ids the product also belongs to via product_categories. */
  additional_category_ids?: string[];
  quantity: number;
  unit_price: number;
};

export type EvaluatedPromotion = {
  rule: PromotionRule;
  qualified: boolean;
  /** Pesos discounted from the cart by this rule (includes shipping savings). */
  discount_amount: number;
  /** If true, the order's shipping should be set to 0. */
  free_shipping: boolean;
  /**
   * When not qualified, how much more is needed. The unit depends on
   * `missing_type` — pesos for `"amount"`, units for `"quantity"`.
   */
  missing_to_qualify?: number;
  /** What kind of threshold the customer is short on. */
  missing_type?: "amount" | "quantity";
};

export type CartPromotionsResult = {
  applied: EvaluatedPromotion[];
  almost: EvaluatedPromotion[];
  /** Sum of all discount amounts. */
  total_discount: number;
  free_shipping: boolean;
};

/**
 * Snapshot persisted on the order so receipts survive rule/code changes.
 * `rule_id` is either a `promotion_rules.id` (auto rule) or `promotions.id`
 * (manual code) — disambiguate by the presence of `code`.
 */
export type AppliedPromotionSnapshot = {
  rule_id: string;
  label: string;
  type: PromotionRuleType;
  discount_amount: number;
  /** Present iff the customer entered a manual code (vs. an auto rule). */
  code?: string;
};

// ============================================================
// Engine (pure — server fetcher lives in `promotions-server.ts` so this
// module can be imported from client components for type + math reuse)
// ============================================================

function qualifyingSubtotal(
  rule: PromotionRule,
  items: CartItemForPromo[],
): number {
  if (rule.scope === "all") {
    return items.reduce((s, i) => s + Number(i.unit_price) * Number(i.quantity), 0);
  }
  if (rule.scope === "products") {
    return items
      .filter((i) => rule.product_ids.includes(i.product_id))
      .reduce((s, i) => s + Number(i.unit_price) * Number(i.quantity), 0);
  }
  // scope === "categories"
  return items
    .filter((i) => {
      const cats = [
        i.category_id,
        ...(i.additional_category_ids ?? []),
      ].filter((x): x is string => Boolean(x));
      return cats.some((c) => rule.category_ids.includes(c));
    })
    .reduce((s, i) => s + Number(i.unit_price) * Number(i.quantity), 0);
}

/** Mirror of `qualifyingSubtotal` that sums units instead of pesos. */
function qualifyingQuantity(
  rule: PromotionRule,
  items: CartItemForPromo[],
): number {
  if (rule.scope === "all") {
    return items.reduce((s, i) => s + Number(i.quantity), 0);
  }
  if (rule.scope === "products") {
    return items
      .filter((i) => rule.product_ids.includes(i.product_id))
      .reduce((s, i) => s + Number(i.quantity), 0);
  }
  // scope === "categories"
  return items
    .filter((i) => {
      const cats = [
        i.category_id,
        ...(i.additional_category_ids ?? []),
      ].filter((x): x is string => Boolean(x));
      return cats.some((c) => rule.category_ids.includes(c));
    })
    .reduce((s, i) => s + Number(i.quantity), 0);
}

/**
 * Evaluate every active rule against the given cart. Returns rules that are
 * currently applied + rules the customer is close to unlocking so the UI can
 * nudge them ("$X away from free shipping").
 *
 * Stacking rule: all qualifying promotions are applied (a free-shipping promo
 * stacks with a percent-off promo). For multiple percent_off / amount_off
 * promos with overlapping scope this could over-discount; in practice the
 * admin keeps a small set.
 */
export function evaluatePromotions(
  rules: PromotionRule[],
  items: CartItemForPromo[],
  shippingCost: number,
): CartPromotionsResult {
  const cartSubtotal = items.reduce(
    (s, i) => s + Number(i.unit_price) * Number(i.quantity),
    0,
  );

  const applied: EvaluatedPromotion[] = [];
  const almost: EvaluatedPromotion[] = [];
  let total = 0;
  let freeShipping = false;

  for (const rule of rules) {
    const min = rule.min_subtotal ?? 0;
    if (cartSubtotal < min) {
      // Only surface as "almost" if customer is meaningfully close (<= 2x the
      // gap of their current cart). Otherwise the list gets noisy.
      const missing = min - cartSubtotal;
      if (missing <= Math.max(cartSubtotal, 100) * 2 || cartSubtotal > 0) {
        almost.push({
          rule,
          qualified: false,
          discount_amount: 0,
          free_shipping: false,
          missing_to_qualify: missing,
          missing_type: "amount",
        });
      }
      continue;
    }

    const qualSubtotal = qualifyingSubtotal(rule, items);
    const qualQty = qualifyingQuantity(rule, items);

    // Quantity gate. Applies to every type; `buy_x_get_y` always sets it,
    // other types use it as an optional additional gate alongside
    // `min_subtotal`.
    const minQty = rule.buy_x ?? 0;
    if (minQty > 0 && qualQty < minQty) {
      const missingQty = minQty - qualQty;
      // Only nudge if the customer already has at least one qualifying unit;
      // otherwise the "X away" message is noise.
      if (qualQty > 0) {
        almost.push({
          rule,
          qualified: false,
          discount_amount: 0,
          free_shipping: false,
          missing_to_qualify: missingQty,
          missing_type: "quantity",
        });
      }
      continue;
    }

    if (qualSubtotal <= 0 && rule.type !== "free_shipping") {
      // Promo applies to products / categories that aren't in this cart.
      continue;
    }

    let discount = 0;
    let makesFreeShipping = false;
    if (rule.type === "free_shipping") {
      makesFreeShipping = true;
      discount = shippingCost;
    } else if (rule.type === "percent_off") {
      discount = round2(qualSubtotal * (rule.discount_value / 100));
    } else if (rule.type === "amount_off") {
      discount = Math.min(rule.discount_value, qualSubtotal);
    } else if (rule.type === "buy_x_get_y") {
      // Buy X get Y free. Discount Y free units per X bought, valued at the
      // average price of a qualifying unit. Cap at qualQty - 1 so the
      // customer can never get the whole order free without paying for
      // anything in scope.
      const buyX = rule.buy_x ?? 2;
      const getY = Math.round(rule.discount_value);
      if (qualQty >= buyX) {
        const freeUnits = Math.floor(qualQty / buyX) * getY;
        const cappedFree = Math.min(freeUnits, qualQty - 1);
        const avgPrice = qualQty > 0 ? qualSubtotal / qualQty : 0;
        discount = round2(cappedFree * avgPrice);
      }
    }

    applied.push({
      rule,
      qualified: true,
      discount_amount: discount,
      free_shipping: makesFreeShipping,
    });
    total += discount;
    if (makesFreeShipping) freeShipping = true;
  }

  return {
    applied,
    almost,
    total_discount: round2(total),
    free_shipping: freeShipping,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Snapshot the applied rules for persistence on the order. Strips internal
 * fields, keeps just what's needed for receipts and order detail views.
 */
export function snapshotApplied(
  applied: EvaluatedPromotion[],
): AppliedPromotionSnapshot[] {
  return applied.map((a) => ({
    rule_id: a.rule.id,
    label: a.rule.label,
    type: a.rule.type,
    discount_amount: a.discount_amount,
  }));
}

// ============================================================
// Display helpers
// ============================================================

export const PROMOTION_TYPE_LABEL: Record<PromotionRuleType, string> = {
  free_shipping: "Envío gratis",
  percent_off: "% de descuento",
  amount_off: "Descuento fijo",
  buy_x_get_y: "Compra X lleva Y",
};

export const PROMOTION_SCOPE_LABEL: Record<PromotionRuleScope, string> = {
  all: "Todo el carrito",
  products: "Productos específicos",
  categories: "Categorías específicas",
};
