import Link from "next/link";
import { redirect } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { EmptyState } from "@/components/admin/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { CheckoutClient } from "@/app/(storefront)/checkout/_components/checkout-client";
import { requireUser } from "@/lib/auth";
import { getCart } from "@/lib/cart";
import { getActivePromotionRules } from "@/lib/promotions-server";

export const metadata = { title: "Checkout" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const { supabase, user } = await requireUser();

  const cart = await getCart();
  if (!cart) return <EmptyCart />;

  type CartRow = {
    id: string;
    quantity: number;
    unit_price: number;
    product_id: string;
    customization: unknown;
    products: {
      name: string;
      images: unknown;
      category_id: string | null;
      is_gift_card: boolean;
    } | null;
    product_variants: { name: string } | null;
  };
  const { data: itemsRaw } = await cart.supabase
    .from("cart_items")
    .select(
      "id, quantity, unit_price, product_id, customization, products!product_id(name, images, category_id, is_gift_card), product_variants(name)",
    )
    .eq("cart_id", cart.cartId)
    .order("created_at", { ascending: false });
  const items = (itemsRaw ?? []) as unknown as CartRow[];
  if (items.length === 0) return <EmptyCart />;

  const [
    { data: addresses },
    { data: branches },
    { data: extraCategoryLinks },
    promotionRules,
  ] = await Promise.all([
    supabase
      .from("addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("branches")
      .select("id, name, address, city, hours, hours_schedule")
      .eq("active", true)
      .order("name"),
    cart.supabase
      .from("product_categories")
      .select("product_id, category_id")
      .in(
        "product_id",
        items.map((i) => i.product_id),
      ),
    getActivePromotionRules(),
  ]);

  if ((addresses?.length ?? 0) === 0 && (branches?.length ?? 0) === 0) {
    redirect("/mi-cuenta/direcciones");
  }

  const extraCatsByProduct = new Map<string, string[]>();
  for (const link of extraCategoryLinks ?? []) {
    const arr = extraCatsByProduct.get(link.product_id) ?? [];
    arr.push(link.category_id);
    extraCatsByProduct.set(link.product_id, arr);
  }

  const clientItems = items.map((i) => {
    const imgs = Array.isArray(i.products?.images)
      ? (i.products?.images as string[])
      : [];
    // Pull the gift-card delivery method out of the customization payload
    // so the client can detect an all-email-gift-card cart and suppress
    // the shipping picker.
    const giftCardData =
      i.customization && typeof i.customization === "object"
        ? ((i.customization as Record<string, unknown>).gift_card as
            | Record<string, unknown>
            | undefined)
        : undefined;
    const delivery_method: "email" | "physical" =
      giftCardData?.delivery_method === "physical" ? "physical" : "email";
    return {
      id: i.id,
      product_id: i.product_id,
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
      product_name: i.products?.name ?? "Producto",
      variant_name: i.product_variants?.name ?? null,
      image_url: imgs[0] ?? null,
      category_id: i.products?.category_id ?? null,
      additional_category_ids: extraCatsByProduct.get(i.product_id) ?? [],
      is_gift_card: Boolean(i.products?.is_gift_card),
      delivery_method,
    };
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight">Checkout</h1>
      <div className="mt-8">
        <CheckoutClient
          items={clientItems}
          addresses={addresses ?? []}
          branches={branches ?? []}
          promotionRules={promotionRules}
        />
      </div>
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <EmptyState
        icon={ShoppingCart}
        title="Tu carrito está vacío"
        description="Agrega productos para poder hacer checkout."
        action={
          <Link href="/productos" className={buttonVariants({ size: "lg" })}>
            Ver productos
          </Link>
        }
      />
    </div>
  );
}
