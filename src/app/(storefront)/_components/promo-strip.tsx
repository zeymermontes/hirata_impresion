import { Fragment } from "react";
import { Sparkles } from "lucide-react";
import { formatMXN } from "@/lib/utils";
import { getCart } from "@/lib/cart";
import {
  evaluatePromotions,
  type CartItemForPromo,
} from "@/lib/promotions";
import { getActivePromotionRules } from "@/lib/promotions-server";

type CartItemRow = {
  quantity: number;
  unit_price: number;
  product_id: string;
  products: { category_id: string | null } | null;
};

/**
 * Top-of-page strip rendered above the storefront header. When the visitor has
 * items in the cart and is close to unlocking a promo, it shows the most
 * actionable "te faltan $X para Y" hint. Otherwise it cycles through the first
 * few active rule labels as advertising.
 */
export async function PromoStrip() {
  const rules = await getActivePromotionRules();
  if (rules.length === 0) return null;

  const cartItems = await loadCartForEvaluation();
  // Shipping cost passed as 0 — the strip never needs to display $$ saved on
  // shipping; free_shipping rules still register as "qualified" once the
  // min_subtotal is met.
  const evaluation = evaluatePromotions(rules, cartItems, 0);

  const closest = evaluation.almost
    .slice()
    .sort(
      (a, b) => (a.missing_to_qualify ?? 0) - (b.missing_to_qualify ?? 0),
    )[0];

  return (
    <div className="bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium sm:text-sm">
        <Sparkles className="h-3.5 w-3.5 shrink-0" />
        {closest ? (
          <span>
            Te faltan{" "}
            <strong>{formatMXN(closest.missing_to_qualify ?? 0)}</strong>{" "}
            para <span>{closest.rule.label}</span>
          </span>
        ) : (
          <span className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            {rules.slice(0, 3).map((r, i) => (
              <Fragment key={r.id}>
                {i > 0 ? (
                  <span className="opacity-60" aria-hidden>
                    ·
                  </span>
                ) : null}
                <span>{r.label}</span>
              </Fragment>
            ))}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Pulls just enough cart data to evaluate promotions. Returns [] for guests
 * without a cart, or if anything goes wrong (the strip must never block
 * layout render).
 */
async function loadCartForEvaluation(): Promise<CartItemForPromo[]> {
  try {
    const cart = await getCart();
    if (!cart) return [];
    const { data } = await cart.supabase
      .from("cart_items")
      .select(
        "quantity, unit_price, product_id, products!product_id(category_id)",
      )
      .eq("cart_id", cart.cartId);
    const rows = (data ?? []) as unknown as CartItemRow[];
    if (rows.length === 0) return [];

    // Also fetch additional category links so category-scoped promos count
    // multi-category products correctly (matches /carrito and /checkout).
    const productIds = Array.from(new Set(rows.map((r) => r.product_id)));
    const { data: extraLinks } = await cart.supabase
      .from("product_categories")
      .select("product_id, category_id")
      .in("product_id", productIds);
    const extras = new Map<string, string[]>();
    for (const l of extraLinks ?? []) {
      const arr = extras.get(l.product_id) ?? [];
      arr.push(l.category_id);
      extras.set(l.product_id, arr);
    }

    return rows.map((r) => ({
      product_id: r.product_id,
      category_id: r.products?.category_id ?? null,
      additional_category_ids: extras.get(r.product_id) ?? [],
      quantity: Number(r.quantity),
      unit_price: Number(r.unit_price),
    }));
  } catch {
    return [];
  }
}
