"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { runAction } from "@/lib/server-action";
import { clearUserCart, getCart } from "@/lib/cart";
import { mpPreference } from "@/lib/mercadopago";
import { env } from "@/lib/env";
import {
  getActivePromotionRules,
  evaluatePromotions,
  snapshotApplied,
  type CartItemForPromo,
} from "@/lib/promotions";
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
  products: { name: string; category_id: string | null } | null;
  product_variants: { name: string } | null;
};

/**
 * Creates a `pending` order from the cart + fulfillment info, re-evaluates
 * promotions server-side (the source of truth — the client's preview is
 * advisory), persists the discount + applied promotion snapshot on the order,
 * and redirects to /checkout/pagar/[orderId] which generates the MercadoPago
 * preference for the final amount.
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
        "id, product_id, variant_id, quantity, unit_price, customization, uploaded_file_url, preview_url, products!product_id(name, category_id), product_variants(name)",
      )
      .eq("cart_id", cart.cartId);
    const items = (itemsRaw ?? []) as unknown as CartItemRow[];
    if (items.length === 0) return { message: "Tu carrito está vacío." };

    let addressSnapshot: Json | null = null;
    let branchId: string | null = null;
    let rawShipping = 0;

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
      rawShipping = SHIPPING_FLAT_MXN;
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

    // Fetch additional category links for multi-category products so the
    // promotion engine evaluates them correctly.
    const productIds = items.map((i) => i.product_id);
    const { data: extraCats } = await cart.supabase
      .from("product_categories")
      .select("product_id, category_id")
      .in("product_id", productIds);
    const extraByProduct = new Map<string, string[]>();
    for (const link of extraCats ?? []) {
      const arr = extraByProduct.get(link.product_id) ?? [];
      arr.push(link.category_id);
      extraByProduct.set(link.product_id, arr);
    }
    const promoItems: CartItemForPromo[] = items.map((i) => ({
      product_id: i.product_id,
      category_id: i.products?.category_id ?? null,
      additional_category_ids: extraByProduct.get(i.product_id) ?? [],
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
    }));

    const rules = await getActivePromotionRules();
    const promos = evaluatePromotions(rules, promoItems, rawShipping);

    const subtotal = items.reduce(
      (acc, i) => acc + Number(i.unit_price) * Number(i.quantity),
      0,
    );
    const shippingCost = promos.free_shipping ? 0 : rawShipping;
    const subtotalDiscount =
      promos.total_discount - (promos.free_shipping ? rawShipping : 0);
    const total = round2(subtotal + shippingCost - subtotalDiscount);

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
        discount_amount: round2(subtotalDiscount),
        applied_promotions:
          promos.applied.length > 0
            ? (snapshotApplied(promos.applied) as unknown as Json)
            : null,
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

    await clearUserCart();
    revalidatePath("/carrito");
    revalidatePath("/mi-cuenta/pedidos");
    redirect(`/checkout/pagar/${order.id}`);
  });
}

/**
 * Builds a MercadoPago Preference for an existing order using a single line
 * item at the order's stored `total` (already discounted server-side). This
 * is simpler and safer than reconstructing per-line prices after promotions;
 * the customer's itemized breakdown lives in our app (/mi-cuenta/pedidos/[id]).
 */
export async function createPreferenceForOrder(
  orderId: string,
): Promise<string> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, total")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) throw new Error("Pedido no encontrado.");

  // Count items for a nicer title.
  const { data: items } = await admin
    .from("order_items")
    .select("quantity")
    .eq("order_id", orderId);
  const totalQty = (items ?? []).reduce(
    (s, i) => s + Number(i.quantity),
    0,
  );

  const isPublicHttps =
    env.SITE_URL.startsWith("https://") && !env.SITE_URL.includes("localhost");

  const preference = await mpPreference().create({
    body: {
      items: [
        {
          id: orderId,
          title: `Hirata Impresión Digital · ${totalQty} ${totalQty === 1 ? "artículo" : "artículos"}`,
          quantity: 1,
          unit_price: Number(order.total),
          currency_id: "MXN",
        },
      ],
      external_reference: orderId,
      back_urls: {
        success: `${env.SITE_URL}/checkout/success?order=${orderId}`,
        failure: `${env.SITE_URL}/checkout/error?order=${orderId}`,
        pending: `${env.SITE_URL}/checkout/success?order=${orderId}`,
      },
      ...(isPublicHttps
        ? {
            auto_return: "approved" as const,
            notification_url: `${env.SITE_URL}/api/webhooks/mercadopago`,
          }
        : {}),
      metadata: { order_id: orderId },
    },
  });

  await admin
    .from("orders")
    .update({ payment_id: preference.id ?? null })
    .eq("id", orderId);

  const initPoint =
    preference.init_point ?? preference.sandbox_init_point ?? null;
  if (!initPoint) {
    throw new Error("MercadoPago no devolvió un link de pago.");
  }
  return initPoint;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
