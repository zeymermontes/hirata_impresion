import Link from "next/link";
import { ShoppingCart, ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/admin/empty-state";
import { CartItemRow } from "@/app/(storefront)/carrito/_components/cart-item-row";
import { PromotionsSummary } from "@/app/(storefront)/_components/promotions-summary";
import { getCart } from "@/lib/cart";
import {
  getActivePromotionRules,
  evaluatePromotions,
  type CartItemForPromo,
} from "@/lib/promotions";
import { formatMXN, cn } from "@/lib/utils";

export const metadata = { title: "Carrito" };
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const cart = await getCart();

  if (!cart) {
    return <EmptyCart />;
  }

  type CartItemRow = {
    id: string;
    quantity: number;
    unit_price: number;
    uploaded_file_url: string | null;
    customization: unknown;
    product_id: string;
    products: {
      slug: string;
      name: string;
      images: unknown;
      category_id: string | null;
    } | null;
    product_variants: { name: string } | null;
  };

  const { data } = await cart.supabase
    .from("cart_items")
    .select(
      "id, quantity, unit_price, uploaded_file_url, customization, product_id, products!product_id(slug, name, images, category_id), product_variants(name)",
    )
    .eq("cart_id", cart.cartId)
    .order("created_at", { ascending: false });

  const items = (data ?? []) as unknown as CartItemRow[];
  if (items.length === 0) {
    return <EmptyCart />;
  }

  const subtotal = items.reduce(
    (acc, i) => acc + Number(i.unit_price) * Number(i.quantity),
    0,
  );

  // Pull additional category links for any products in the cart so the
  // promotion engine can credit multi-category items toward category-scoped
  // promos.
  const productIds = Array.from(new Set(items.map((i) => i.product_id)));
  const { data: extraCategoryLinks } = await cart.supabase
    .from("product_categories")
    .select("product_id, category_id")
    .in("product_id", productIds);
  const extraCatsByProduct = new Map<string, string[]>();
  for (const link of extraCategoryLinks ?? []) {
    const arr = extraCatsByProduct.get(link.product_id) ?? [];
    arr.push(link.category_id);
    extraCatsByProduct.set(link.product_id, arr);
  }

  const promoItems: CartItemForPromo[] = items.map((i) => ({
    product_id: i.product_id,
    category_id: i.products?.category_id ?? null,
    additional_category_ids: extraCatsByProduct.get(i.product_id) ?? [],
    quantity: Number(i.quantity),
    unit_price: Number(i.unit_price),
  }));

  // Shipping is unknown until checkout (depends on ship vs pickup). We
  // evaluate with 0 here for the "applied" amounts; the real number lands in
  // the checkout summary. The "almost there" hints are still meaningful.
  const rules = await getActivePromotionRules();
  const promos = evaluatePromotions(rules, promoItems, 0);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight">Tu carrito</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="rounded-xl border border-border bg-card">
          <div className="divide-y divide-border px-5">
            {items.map((i) => {
              const product = i.products;
              const variant = i.product_variants;
              const imgs = Array.isArray(product?.images)
                ? (product?.images as string[])
                : [];
              const customization =
                i.customization && typeof i.customization === "object"
                  ? (i.customization as Record<string, unknown>)
                  : null;
              return (
                <CartItemRow
                  key={i.id}
                  id={i.id}
                  productSlug={product?.slug ?? null}
                  productName={product?.name ?? "Producto"}
                  variantName={variant?.name ?? null}
                  quantity={Number(i.quantity)}
                  unitPrice={Number(i.unit_price)}
                  imageUrl={imgs[0] ?? null}
                  uploadedFileUrl={i.uploaded_file_url ?? null}
                  customization={customization}
                />
              );
            })}
          </div>
        </div>

        <Card className="h-fit">
          <CardContent className="space-y-4 p-6">
            <h2 className="text-lg font-semibold">Resumen</h2>
            <PromotionsSummary result={promos} />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatMXN(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Envío</span>
                <span className="text-muted-foreground">
                  Se calcula en checkout
                </span>
              </div>
            </div>
            <div className="flex items-baseline justify-between border-t border-border pt-3">
              <span className="font-semibold">Total estimado</span>
              <span className="text-xl font-bold">{formatMXN(subtotal)}</span>
            </div>
            <Link
              href="/checkout"
              className={cn(buttonVariants({ size: "lg" }), "w-full gap-2")}
            >
              Proceder al checkout
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/productos"
              className="block text-center text-sm text-muted-foreground hover:text-foreground"
            >
              Seguir comprando
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <EmptyState
        icon={ShoppingCart}
        title="Tu carrito está vacío"
        description="Explora el catálogo y agrega productos para empezar."
        action={
          <Link
            href="/productos"
            className={buttonVariants({ size: "lg" })}
          >
            Ver productos
          </Link>
        }
      />
    </div>
  );
}
