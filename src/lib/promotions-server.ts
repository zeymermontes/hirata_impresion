import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PromotionRule } from "@/lib/promotions";

/**
 * Fetch active rules within the current time window. The query also joins to
 * the product/category link tables so the engine can decide which items in
 * the cart qualify under each rule's scope.
 *
 * Lives in a *-server module (not `promotions.ts`) because it pulls in
 * `@/lib/supabase/server` → `next/headers`, which can't be bundled into
 * client components. Pure types and evaluation live in `promotions.ts`.
 */
export async function getActivePromotionRules(): Promise<PromotionRule[]> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

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
