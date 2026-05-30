// ============================================================
// Gift cards — client-safe types + pure helpers
// ============================================================
//
// Anything that touches the admin client (lookup, redemption, issuance,
// email delivery) lives in `gift-cards-server.ts`. This module is safe to
// import from client components for types and presentational helpers.

export type GiftCard = {
  id: string;
  code: string;
  initial_amount: number;
  balance: number;
  recipient_email: string | null;
  recipient_name: string | null;
  sender_name: string | null;
  message: string | null;
  expires_at: string | null;
  active: boolean;
};

export type GiftCardValidation =
  | { ok: true; card: GiftCard }
  | { ok: false; message: string };

/**
 * Snapshot persisted on the order (mirrors `AppliedPromotionSnapshot`)
 * so receipts survive future balance changes.
 */
export type AppliedGiftCardSnapshot = {
  gift_card_id: string;
  code: string;
  amount: number;
};

/**
 * Format a gift card code for display. Codes are stored uppercase already,
 * but this normalizes input from forms.
 */
export function normalizeCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * Generate a memorable, hyphenated gift card code: `HIRATA-XXXX-YYYY`.
 * Avoids characters that look alike (0/O, 1/I/L) so handwritten copies
 * survive a phone call.
 */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function generateGiftCardCode(): string {
  const groups: string[] = [];
  for (let g = 0; g < 2; g++) {
    let chunk = "";
    for (let i = 0; i < 4; i++) {
      chunk += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    groups.push(chunk);
  }
  return `HIRATA-${groups[0]}-${groups[1]}`;
}

/**
 * How much of a card's balance applies to an order of `orderTotal` pesos.
 * Caps at the lesser of `balance` and `orderTotal` (can't redeem more than
 * the order is worth — the rest stays on the card for later).
 */
export function applicableAmount(
  balance: number,
  orderTotal: number,
): number {
  if (balance <= 0 || orderTotal <= 0) return 0;
  return Math.min(round2(balance), round2(orderTotal));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ============================================================
// Cart-customization payload
// ============================================================
//
// When a customer buys a gift card, the storefront stores the recipient
// info on `cart_items.customization` (then copied to `order_items` at
// checkout). This shape is what `issueGiftCardForOrderItem` reads to fill
// the new `gift_cards` row.

export type GiftCardDeliveryMethod = "email" | "physical";

export type GiftCardPurchasePayload = {
  /** The amount (in pesos) the customer picked. Drives `unit_price`. */
  amount: number;
  /**
   * "email"    — recipient gets the code by email on payment approval, no
   *              shipping cost.
   * "physical" — admin ships a printed/branded card to the order's
   *              shipping address, normal shipping cost applies.
   */
  delivery_method: GiftCardDeliveryMethod;
  /** Required when delivery_method is "email"; optional for physical. */
  recipient_email?: string;
  recipient_name?: string;
  sender_name?: string;
  message?: string;
};

export function parseGiftCardPurchasePayload(
  customization: unknown,
): GiftCardPurchasePayload | null {
  if (!customization || typeof customization !== "object") return null;
  const c = customization as Record<string, unknown>;
  const gc = c.gift_card;
  if (!gc || typeof gc !== "object") return null;
  const v = gc as Record<string, unknown>;
  const amount = Number(v.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const delivery_method: GiftCardDeliveryMethod =
    v.delivery_method === "physical" ? "physical" : "email";
  const recipient_email =
    typeof v.recipient_email === "string" ? v.recipient_email.trim() : "";
  // Email delivery requires an address; physical delivery doesn't (the
  // card ships to the order's shipping address).
  if (delivery_method === "email" && !recipient_email) return null;
  return {
    amount,
    delivery_method,
    recipient_email: recipient_email || undefined,
    recipient_name:
      typeof v.recipient_name === "string" && v.recipient_name.trim()
        ? v.recipient_name.trim()
        : undefined,
    sender_name:
      typeof v.sender_name === "string" && v.sender_name.trim()
        ? v.sender_name.trim()
        : undefined,
    message:
      typeof v.message === "string" && v.message.trim()
        ? v.message.trim()
        : undefined,
  };
}
