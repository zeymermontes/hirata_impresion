import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const GUEST_COOKIE = "hirata_guest_id";

/**
 * Return the cart for the current session. Creates one if it doesn't exist.
 * Logged-in users get a cart tied to their user_id; guests get one tied to a
 * cookie-stored guest_id (UUID).
 */
export async function getOrCreateCart() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const cookieStore = await cookies();

  if (user) {
    const { data: existing } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing) return { cartId: existing.id, supabase, user, guestId: null };

    const { data: created, error } = await supabase
      .from("carts")
      .insert({ user_id: user.id })
      .select("id")
      .single();
    if (error || !created) throw error ?? new Error("No se pudo crear el carrito");
    return { cartId: created.id, supabase, user, guestId: null };
  }

  let guestId = cookieStore.get(GUEST_COOKIE)?.value;
  if (!guestId) {
    guestId = crypto.randomUUID();
    cookieStore.set(GUEST_COOKIE, guestId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  const { data: existing } = await supabase
    .from("carts")
    .select("id")
    .eq("guest_id", guestId)
    .maybeSingle();
  if (existing) return { cartId: existing.id, supabase, user: null, guestId };

  const { data: created, error } = await supabase
    .from("carts")
    .insert({ guest_id: guestId })
    .select("id")
    .single();
  if (error || !created) throw error ?? new Error("No se pudo crear el carrito");
  return { cartId: created.id, supabase, user: null, guestId };
}

/**
 * Read the cart (or null if it doesn't exist yet). Does NOT create one.
 */
export async function getCart() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const cookieStore = await cookies();

  if (user) {
    const { data } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    return data ? { cartId: data.id, supabase, user, guestId: null } : null;
  }

  const guestId = cookieStore.get(GUEST_COOKIE)?.value;
  if (!guestId) return null;
  const { data } = await supabase
    .from("carts")
    .select("id")
    .eq("guest_id", guestId)
    .maybeSingle();
  return data ? { cartId: data.id, supabase, user: null, guestId } : null;
}

/**
 * Count items in the current cart (for header badge).
 */
export async function getCartItemCount(): Promise<number> {
  const cart = await getCart();
  if (!cart) return 0;
  const { data } = await cart.supabase
    .from("cart_items")
    .select("quantity")
    .eq("cart_id", cart.cartId);
  return (data ?? []).reduce((acc, i) => acc + Number(i.quantity), 0);
}

/**
 * Delete every item in the user's cart. Called after creating an order so the
 * customer doesn't accidentally checkout the same items twice.
 */
export async function clearUserCart(): Promise<void> {
  const cart = await getCart();
  if (!cart) return;
  await cart.supabase.from("cart_items").delete().eq("cart_id", cart.cartId);
}

/**
 * Count pending orders for the current user (status = 'pending'). Used by the
 * header to surface a "you have unfinished payments" indicator.
 */
export async function getPendingOrderCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;
  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "pending");
  return count ?? 0;
}

/**
 * Merge guest cart items into the user's cart after login.
 * Called from a Server Action that runs right after sign-in.
 */
export async function mergeGuestCartIntoUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const cookieStore = await cookies();
  const guestId = cookieStore.get(GUEST_COOKIE)?.value;
  if (!guestId) return;

  const { data: guestCart } = await supabase
    .from("carts")
    .select("id")
    .eq("guest_id", guestId)
    .maybeSingle();
  if (!guestCart) return;

  const { data: userCart } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!userCart) {
    // No user cart yet — just claim the guest cart by reassigning ownership.
    await supabase
      .from("carts")
      .update({ user_id: user.id, guest_id: null })
      .eq("id", guestCart.id);
  } else {
    // Move guest items into the user cart, then delete the guest cart.
    await supabase
      .from("cart_items")
      .update({ cart_id: userCart.id })
      .eq("cart_id", guestCart.id);
    await supabase.from("carts").delete().eq("id", guestCart.id);
  }

  cookieStore.delete(GUEST_COOKIE);
}
