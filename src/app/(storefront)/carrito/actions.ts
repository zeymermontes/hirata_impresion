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
      .select("base_price, requires_file")
      .eq("id", parsed.data.product_id)
      .maybeSingle();
    if (!product) return { message: "Producto no encontrado." };

    if (product.requires_file && !parsed.data.uploaded_file_url) {
      return { message: "Este producto requiere que subas un archivo." };
    }

    let unitPrice = Number(product.base_price);
    if (parsed.data.variant_id) {
      const { data: variant } = await supabase
        .from("product_variants")
        .select("price_delta")
        .eq("id", parsed.data.variant_id)
        .maybeSingle();
      if (variant) unitPrice += Number(variant.price_delta);
    }

    let customization: Json | null = null;
    if (parsed.data.customization) {
      try {
        customization = JSON.parse(parsed.data.customization) as Json;
      } catch {
        customization = null;
      }
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
