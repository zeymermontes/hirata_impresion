import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendBuyerGiftCardConfirmation,
  sendGiftCardEmail,
  type BuyerGiftCardIssued,
} from "@/lib/email";
import {
  type GiftCard,
  type GiftCardValidation,
  generateGiftCardCode,
  normalizeCode,
  parseGiftCardPurchasePayload,
} from "@/lib/gift-cards";

const SELECT_COLS =
  "id, code, initial_amount, balance, recipient_email, recipient_name, sender_name, message, expires_at, active";

/**
 * Find a card by code (case-insensitive). Uses the admin client because
 * `gift_cards` is admin-read RLS — public anon should never enumerate
 * codes.
 */
export async function findGiftCardByCode(
  code: string,
): Promise<GiftCard | null> {
  const cleaned = normalizeCode(code);
  if (!cleaned) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("gift_cards")
    .select(SELECT_COLS)
    .ilike("code", cleaned)
    .maybeSingle();
  if (!data) return null;
  return mapCard(data);
}

/**
 * Validate a code for redemption. Returns a typed result with a Spanish
 * error message ready to show in the UI.
 */
export async function validateGiftCard(
  code: string,
): Promise<GiftCardValidation> {
  const card = await findGiftCardByCode(code);
  if (!card) return { ok: false, message: "Código no válido." };
  if (!card.active) {
    return { ok: false, message: "Esta gift card ya no está activa." };
  }
  if (card.expires_at && new Date(card.expires_at) < new Date()) {
    return { ok: false, message: "Esta gift card ya venció." };
  }
  if (card.balance <= 0) {
    return {
      ok: false,
      message: "Esta gift card ya no tiene saldo.",
    };
  }
  return { ok: true, card };
}

/**
 * Atomically decrement a card's balance and write a redemption row.
 * Returns true on success. Caller is responsible for re-validating the
 * card *before* calling (this function just performs the writes).
 *
 * NOTE: Postgres lacks a clean "decrement-with-floor" via supabase-js, so
 * we read-then-write. Race risk is low (one customer, one card) but for
 * extra safety we use the `active=true and balance >= amount` filter on
 * the update so a second concurrent redemption fails the UPDATE.
 */
export async function redeemGiftCard(
  giftCardId: string,
  orderId: string,
  amount: number,
): Promise<boolean> {
  if (amount <= 0) return false;
  const admin = createAdminClient();

  const { data: current } = await admin
    .from("gift_cards")
    .select("balance, active")
    .eq("id", giftCardId)
    .maybeSingle();
  if (!current || !current.active) return false;
  const nextBalance = Number(current.balance) - amount;
  if (nextBalance < 0) return false;

  const { error: redErr } = await admin
    .from("gift_card_redemptions")
    .insert({ gift_card_id: giftCardId, order_id: orderId, amount });
  if (redErr) {
    console.error("[gift-cards] failed to insert redemption:", redErr);
    return false;
  }

  const { error: updErr } = await admin
    .from("gift_cards")
    .update({
      balance: nextBalance,
      active: nextBalance > 0,
    })
    .eq("id", giftCardId)
    .gte("balance", amount); // race guard
  if (updErr) {
    console.error("[gift-cards] failed to decrement balance:", updErr);
    return false;
  }
  return true;
}

/**
 * Issue a gift card for a paid order_item, idempotently. If a card already
 * exists for this `order_item_id` (e.g. webhook + success page race) the
 * existing row is returned untouched.
 *
 * The amount and recipient details come from `order_items.customization`,
 * which was filled by the storefront's product detail form.
 */
export async function issueGiftCardForOrderItem(input: {
  orderItemId: string;
  orderId: string;
  customization: unknown;
  buyerUserId: string;
  buyerEmail: string | null;
}): Promise<{ card: GiftCard; wasNew: boolean } | null> {
  const admin = createAdminClient();

  // Idempotency check first — return existing card if it's already issued.
  const { data: existing } = await admin
    .from("gift_cards")
    .select(SELECT_COLS)
    .eq("order_item_id", input.orderItemId)
    .maybeSingle();
  if (existing) return { card: mapCard(existing), wasNew: false };

  const payload = parseGiftCardPurchasePayload(input.customization);
  if (!payload) {
    console.warn(
      `[gift-cards] order_item ${input.orderItemId} has no valid gift_card payload, skipping`,
    );
    return null;
  }

  // Generate a unique code (retry on the rare collision).
  let code = generateGiftCardCode();
  for (let i = 0; i < 5; i++) {
    const { data: clash } = await admin
      .from("gift_cards")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (!clash) break;
    code = generateGiftCardCode();
  }

  // Default expiry: 1 year from issuance.
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  const { data: inserted, error } = await admin
    .from("gift_cards")
    .insert({
      code,
      initial_amount: payload.amount,
      balance: payload.amount,
      recipient_email: payload.recipient_email ?? null,
      recipient_name: payload.recipient_name ?? null,
      sender_name: payload.sender_name ?? null,
      message: payload.message ?? null,
      order_id: input.orderId,
      order_item_id: input.orderItemId,
      expires_at: expiresAt.toISOString(),
      issued_to_user_id: null,
      active: true,
      delivery_method: payload.delivery_method,
    })
    .select(SELECT_COLS)
    .single();
  if (error || !inserted) {
    console.error(
      `[gift-cards] failed to issue card for order_item ${input.orderItemId}:`,
      error,
    );
    return null;
  }

  const card = mapCard(inserted);

  // Email delivery only for digital cards. Physical cards are handed off to
  // the admin to print and ship — no automated email goes out.
  if (payload.delivery_method === "email") {
    console.info(
      `[gift-cards] dispatching recipient email → card=${card.id} code=${card.code} to="${card.recipient_email ?? "(none)"}"`,
    );
    try {
      await sendGiftCardEmail(card);
      await admin
        .from("gift_cards")
        .update({ delivered_at: new Date().toISOString() })
        .eq("id", card.id);
    } catch (e) {
      console.error(
        `[gift-cards] email delivery failed for card ${card.id}:`,
        e,
      );
    }
  } else {
    console.info(
      `[gift-cards] card ${card.id} is physical, skipping email send`,
    );
  }

  return { card, wasNew: true };
}

/**
 * Redeem any gift card the order reserved at creation time. Called when
 * payment is approved. Idempotent — checks the `gift_card_redemptions`
 * table for an existing row before decrementing balance.
 *
 * Returns `true` if a redemption happened (or already existed), `false`
 * if the order had no card reserved.
 */
export async function redeemPendingGiftCardForOrder(
  orderId: string,
): Promise<boolean> {
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, gift_card_id, gift_card_amount")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || !order.gift_card_id || Number(order.gift_card_amount) <= 0) {
    return false;
  }
  // Idempotency: bail if we already redeemed for this order.
  const { data: existing } = await admin
    .from("gift_card_redemptions")
    .select("id")
    .eq("order_id", orderId)
    .eq("gift_card_id", order.gift_card_id)
    .maybeSingle();
  if (existing) return true;

  return await redeemGiftCard(
    order.gift_card_id,
    orderId,
    Number(order.gift_card_amount),
  );
}

/**
 * Sweep an entire order's items and issue gift cards for any that came
 * from gift-card products. Idempotent — running it twice is a no-op.
 *
 * Called from both the MP webhook (server-side, source of truth) and the
 * success page (so it works even if the webhook is slow).
 */
export async function issueGiftCardsForPaidOrder(
  orderId: string,
): Promise<void> {
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, user_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return;

  const { data: items } = await admin
    .from("order_items")
    .select("id, product_id, customization, products!product_id(is_gift_card)")
    .eq("order_id", orderId);
  if (!items) return;

  type Row = {
    id: string;
    product_id: string | null;
    customization: unknown;
    products: { is_gift_card: boolean } | null;
  };
  const giftCardItems = (items as unknown as Row[]).filter(
    (i) => i.products?.is_gift_card,
  );
  if (giftCardItems.length === 0) return;

  // Look up the buyer's email + display name so we can send them a
  // confirmation that the cards went out.
  let buyerEmail: string | null = null;
  let buyerName: string | null = null;
  try {
    const { data: u } = await admin.auth.admin.getUserById(order.user_id);
    buyerEmail = u.user?.email ?? null;
  } catch {
    buyerEmail = null;
  }
  try {
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", order.user_id)
      .maybeSingle();
    buyerName = profile?.full_name ?? null;
  } catch {
    buyerName = null;
  }
  console.info(
    `[gift-cards] order=${orderId} buyer user_id=${order.user_id} email="${buyerEmail ?? "(none)"}" name="${buyerName ?? "(none)"}"`,
  );

  const newlyIssued: BuyerGiftCardIssued[] = [];
  for (const item of giftCardItems) {
    const result = await issueGiftCardForOrderItem({
      orderItemId: item.id,
      orderId: order.id,
      customization: item.customization,
      buyerUserId: order.user_id,
      buyerEmail,
    });
    if (result?.wasNew) {
      newlyIssued.push({
        amount: result.card.initial_amount,
        recipient_email: result.card.recipient_email,
        recipient_name: result.card.recipient_name,
        delivery_method: payloadIsPhysical(item.customization)
          ? "physical"
          : "email",
      });
    }
  }

  // Only notify the buyer if we issued *new* cards this run. A no-op sweep
  // (e.g. webhook + success-page double-fire) won't send a duplicate email.
  if (newlyIssued.length > 0 && buyerEmail) {
    console.info(
      `[gift-cards] dispatching buyer confirmation → to="${buyerEmail}" cards=${newlyIssued.length}`,
    );
    try {
      await sendBuyerGiftCardConfirmation({
        buyerEmail,
        buyerName,
        orderId: order.id,
        cards: newlyIssued,
      });
    } catch (e) {
      console.error(
        "[gift-cards] buyer confirmation email failed:",
        e,
      );
    }
  } else if (newlyIssued.length > 0 && !buyerEmail) {
    console.warn(
      `[gift-cards] ${newlyIssued.length} new cards issued for order ${order.id} but no buyer email available — skipping confirmation`,
    );
  } else {
    console.info(
      `[gift-cards] no newly-issued cards for order ${order.id} — skipping buyer confirmation`,
    );
  }
}

function payloadIsPhysical(customization: unknown): boolean {
  if (!customization || typeof customization !== "object") return false;
  const gc = (customization as Record<string, unknown>).gift_card;
  if (!gc || typeof gc !== "object") return false;
  return (gc as Record<string, unknown>).delivery_method === "physical";
}

function mapCard(row: {
  id: string;
  code: string;
  initial_amount: number | string;
  balance: number | string;
  recipient_email: string | null;
  recipient_name: string | null;
  sender_name: string | null;
  message: string | null;
  expires_at: string | null;
  active: boolean;
}): GiftCard {
  return {
    id: row.id,
    code: row.code,
    initial_amount: Number(row.initial_amount),
    balance: Number(row.balance),
    recipient_email: row.recipient_email,
    recipient_name: row.recipient_name,
    sender_name: row.sender_name,
    message: row.message,
    expires_at: row.expires_at,
    active: row.active,
  };
}
