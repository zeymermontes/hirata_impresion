"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getOrCreateCart, getCart } from "@/lib/cart";
import { runAction } from "@/lib/server-action";
import type { Json } from "@/lib/supabase/database.types";

const AddToCartSchema = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().optional().nullable(),
  quantity: z.coerce.number().int().min(1).max(999),
  customization: z.string().optional().nullable(),
  uploaded_file_url: z.string().optional().nullable(),
});

export type AddToCartState = {
  ok?: boolean;
  message?: string;
};

export async function addToCartAction(
  _prev: AddToCartState | undefined,
  formData: FormData,
): Promise<AddToCartState> {
  return runAction(async () => {
    const parsed = AddToCartSchema.safeParse({
      product_id: formData.get("product_id"),
      variant_id: formData.get("variant_id") || null,
      quantity: formData.get("quantity") || 1,
      customization: formData.get("customization") || null,
      uploaded_file_url: formData.get("uploaded_file_url") || null,
    });
    if (!parsed.success) {
      return { message: "Datos inválidos." };
    }

    const { cartId, supabase } = await getOrCreateCart();

    const { data: product } = await supabase
      .from("products")
      .select(
        "base_price, requires_file, is_gift_card, gift_card_min_amount, gift_card_max_amount",
      )
      .eq("id", parsed.data.product_id)
      .maybeSingle();
    if (!product) return { message: "Producto no encontrado." };

    if (product.requires_file && !parsed.data.uploaded_file_url) {
      return { message: "Este producto requiere que subas un archivo." };
    }

    let customization: Json | null = null;
    if (parsed.data.customization) {
      try {
        customization = JSON.parse(parsed.data.customization) as Json;
      } catch {
        customization = null;
      }
    }

    let unitPrice = Number(product.base_price);

    if (product.is_gift_card) {
      // Gift cards: unit_price comes from the buyer-chosen amount in the
      // customization payload, clamped to the product's min/max range.
      const giftCardData =
        customization && typeof customization === "object" && !Array.isArray(customization)
          ? ((customization as Record<string, unknown>).gift_card as
              | Record<string, unknown>
              | undefined)
          : undefined;
      const amount = Number(giftCardData?.amount);
      const deliveryMethod =
        giftCardData?.delivery_method === "physical" ? "physical" : "email";
      const recipient = String(giftCardData?.recipient_email ?? "").trim();
      if (!Number.isFinite(amount) || amount <= 0) {
        return { message: "Elige un monto para la gift card." };
      }
      // Recipient email is required for email delivery; physical delivery
      // ships to the order's shipping address, so it's optional.
      if (deliveryMethod === "email") {
        if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
          return { message: "Ingresa un email válido para el destinatario." };
        }
      }
      const min = Number(product.gift_card_min_amount ?? 100);
      const max = Number(product.gift_card_max_amount ?? 10000);
      if (amount < min || amount > max) {
        return {
          message: `El monto debe estar entre ${min} y ${max} pesos.`,
        };
      }
      unitPrice = amount;
    } else if (parsed.data.variant_id) {
      const { data: variant } = await supabase
        .from("product_variants")
        .select("price_delta")
        .eq("id", parsed.data.variant_id)
        .maybeSingle();
      if (variant) unitPrice += Number(variant.price_delta);
    }

    const { error } = await supabase.from("cart_items").insert({
      cart_id: cartId,
      product_id: parsed.data.product_id,
      variant_id: parsed.data.variant_id,
      quantity: parsed.data.quantity,
      unit_price: unitPrice,
      customization,
      uploaded_file_url: parsed.data.uploaded_file_url,
    });
    if (error) return { message: error.message };

    revalidatePath("/carrito");
    revalidatePath("/", "layout");
    return { ok: true, message: "Agregado al carrito." };
  });
}

export async function updateCartItemQty(itemId: string, quantity: number) {
  const cart = await getCart();
  if (!cart) return;
  const q = Math.max(1, Math.min(999, Math.trunc(quantity)));
  await cart.supabase
    .from("cart_items")
    .update({ quantity: q })
    .eq("id", itemId)
    .eq("cart_id", cart.cartId);
  revalidatePath("/carrito");
  revalidatePath("/", "layout");
}

export async function removeCartItem(itemId: string) {
  const cart = await getCart();
  if (!cart) return;
  await cart.supabase
    .from("cart_items")
    .delete()
    .eq("id", itemId)
    .eq("cart_id", cart.cartId);
  revalidatePath("/carrito");
  revalidatePath("/", "layout");
}
