"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { runAction } from "@/lib/server-action";
import { clearUserCart, getCart } from "@/lib/cart";
import type { Json } from "@/lib/supabase/database.types";

const SHIPPING_FLAT_MXN = 100;

const CheckoutSchema = z.discriminatedUnion("fulfillment", [
  z.object({
    fulfillment: z.literal("ship"),
    address_id: z.string().uuid("Selecciona una dirección"),
  }),
  z.object({
    fulfillment: z.literal("pickup"),
    branch_id: z.string().uuid("Selecciona una sucursal"),
  }),
]);

export type CreateOrderState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
};

type CartItemRow = {
  id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  unit_price: number;
  customization: unknown;
  uploaded_file_url: string | null;
  preview_url: string | null;
  products: { name: string } | null;
  product_variants: { name: string } | null;
};

/**
 * Creates a `pending` order from the current cart and the selected fulfillment
 * info. On success, **redirects** to `/checkout/pagar/[orderId]` where the
 * MercadoPago Payment Brick is mounted. The redirect path also handles
 * "resume payment" if the user abandons and comes back later from
 * /mi-cuenta/pedidos.
 *
 * We don't return the orderId/total to the client because the previous design
 * (client-side render switching) was broken: revalidatePath on the current
 * page would refetch /checkout with an empty cart and replace CheckoutClient
 * with <EmptyCart />, losing the React state.
 */
export async function createOrderAction(
  _prev: CreateOrderState | undefined,
  formData: FormData,
): Promise<CreateOrderState> {
  return runAction(async () => {
    const parsed = CheckoutSchema.safeParse({
      fulfillment: formData.get("fulfillment"),
      address_id: formData.get("address_id") || undefined,
      branch_id: formData.get("branch_id") || undefined,
    });
    if (!parsed.success) {
      return { errors: z.flattenError(parsed.error).fieldErrors };
    }

    const { supabase, user } = await requireUser();

    const cart = await getCart();
    if (!cart) return { message: "Tu carrito está vacío." };

    const { data: itemsRaw } = await cart.supabase
      .from("cart_items")
      .select(
        "id, product_id, variant_id, quantity, unit_price, customization, uploaded_file_url, preview_url, products(name), product_variants(name)",
      )
      .eq("cart_id", cart.cartId);
    const items = (itemsRaw ?? []) as unknown as CartItemRow[];
    if (items.length === 0) return { message: "Tu carrito está vacío." };

    let addressSnapshot: Json | null = null;
    let branchId: string | null = null;
    let shippingCost = 0;

    if (parsed.data.fulfillment === "ship") {
      const { data: addr } = await supabase
        .from("addresses")
        .select("*")
        .eq("id", parsed.data.address_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!addr) return { message: "Dirección no encontrada." };
      addressSnapshot = {
        label: addr.label,
        recipient: addr.recipient,
        street: addr.street,
        ext_number: addr.ext_number,
        int_number: addr.int_number,
        neighborhood: addr.neighborhood,
        city: addr.city,
        state: addr.state,
        zip: addr.zip,
        phone: addr.phone,
      };
      shippingCost = SHIPPING_FLAT_MXN;
    } else {
      const { data: branch } = await supabase
        .from("branches")
        .select("id")
        .eq("id", parsed.data.branch_id)
        .eq("active", true)
        .maybeSingle();
      if (!branch) return { message: "Sucursal no disponible." };
      branchId = branch.id;
    }

    const subtotal = items.reduce(
      (acc, i) => acc + Number(i.unit_price) * Number(i.quantity),
      0,
    );
    const total = subtotal + shippingCost;

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        status: "pending",
        subtotal,
        shipping_cost: shippingCost,
        total,
        fulfillment: parsed.data.fulfillment,
        address_snapshot: addressSnapshot,
        branch_id: branchId,
        payment_provider: "mercadopago",
      })
      .select("id, total")
      .single();
    if (orderErr || !order) {
      return { message: orderErr?.message ?? "No se pudo crear el pedido." };
    }

    const orderItemsInsert = items.map((i) => ({
      order_id: order.id,
      product_id: i.product_id,
      product_name: i.products?.name ?? "Producto",
      variant_name: i.product_variants?.name ?? null,
      quantity: i.quantity,
      unit_price: i.unit_price,
      customization: (i.customization ?? null) as never,
      uploaded_file_url: i.uploaded_file_url,
      preview_url: i.preview_url,
    }));
    const { error: itemsErr } = await supabase
      .from("order_items")
      .insert(orderItemsInsert);
    if (itemsErr) return { message: itemsErr.message };

    // Items are now committed to the order — empty the cart so the customer
    // can't accidentally check out the same items twice.
    await clearUserCart();
    // Only revalidate destinations we navigate to or that the next page
    // shows. Critically, NOT "/checkout" (or "/" layout) because that would
    // refetch the current page and replace the in-flight UI with the empty
    // cart state before the redirect lands.
    revalidatePath("/carrito");
    revalidatePath("/mi-cuenta/pedidos");
    redirect(`/checkout/pagar/${order.id}`);
  });
}
