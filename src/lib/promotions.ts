import { createClient } from "@/lib/supabase/server";
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
  /** When not qualified, how many pesos more are needed to hit `min_subtotal`. */
  missing_to_qualify?: number;
};

export type CartPromotionsResult = {
  applied: EvaluatedPromotion[];
  almost: EvaluatedPromotion[];
  /** Sum of all discount amounts. */
  total_discount: number;
  free_shipping: boolean;
};

/** Snapshot persisted on the order so receipts survive rule changes. */
export type AppliedPromotionSnapshot = {
  rule_id: string;
  label: string;
  type: PromotionRuleType;
  discount_amount: number;
};

// ============================================================
// Engine
// ============================================================

/**
 * Fetch active rules within the current time window. The query also joins to
 * the product/category link tables so the engine can decide which items in the
 * cart qualify under each rule's scope.
 */
export async function getActivePromotionRules(): Promise<PromotionRule[]> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  // Public can read active rules per RLS. Fetch all in one shot then filter
  // the time window in JS (Supabase's `.or()` for null-safe ranges is awkward).
  const { data: rules } = await supabase
    .from("promotion_rules")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  const live = (rules ?? []).filter((r) => {
    if (r.starts_at && r.starts_at > nowIso) return false;
    if (r.ends_at && r.ends_at <= nowIso) return false;
    return true;
  });
  if (live.length === 0) return [];

  const ruleIds = live.map((r) => r.id);
  const [{ data: prods }, { data: cats }] = await Promise.all([
    supabase
      .from("promotion_rule_products")
      .select("promotion_rule_id, product_id")
      .in("promotion_rule_id", ruleIds),
    supabase
      .from("promotion_rule_categories")
      .select("promotion_rule_id, category_id")
      .in("promotion_rule_id", ruleIds),
  ]);

  const productsByRule = new Map<string, string[]>();
  for (const row of prods ?? []) {
    const arr = productsByRule.get(row.promotion_rule_id) ?? [];
    arr.push(row.product_id);
    productsByRule.set(row.promotion_rule_id, arr);
  }
  const catsByRule = new Map<string, string[]>();
  for (const row of cats ?? []) {
    const arr = catsByRule.get(row.promotion_rule_id) ?? [];
    arr.push(row.category_id);
    catsByRule.set(row.promotion_rule_id, arr);
  }

  return live.map((r) => ({
    ...r,
    discount_value: Number(r.discount_value),
    min_subtotal: r.min_subtotal === null ? null : Number(r.min_subtotal),
    product_ids: productsByRule.get(r.id) ?? [],
    category_ids: catsByRule.get(r.id) ?? [],
  }));
}

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
        });
      }
      continue;
    }

    const qualSubtotal = qualifyingSubtotal(rule, items);
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
};

export const PROMOTION_SCOPE_LABEL: Record<PromotionRuleScope, string> = {
  all: "Todo el carrito",
  products: "Productos específicos",
  categories: "Categorías específicas",
};
