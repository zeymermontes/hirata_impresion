-- Gift cards: a special product type that, on payment approval, issues a
-- unique code with a balance the recipient can redeem at checkout. Supports
-- partial redemption — a $1000 card can pay $300 + $700 across two orders.
--
-- Model:
--   * `products.is_gift_card` flags a product as the gift-card SKU. Admin
--     also sets min/max amounts; the storefront picker enforces the range.
--   * `gift_cards` is the issued instance — one row per code generated. The
--     unit_price of the order item the customer paid is what fills
--     `initial_amount`. `balance` is the remaining redeemable amount.
--   * `gift_card_redemptions` is the audit log: every time a customer
--     applies a card to a checkout, we insert a row.
--   * `orders.gift_card_amount` mirrors `discount_amount` for surface
--     accounting — receipts show "Gift card aplicada -$X".
--
-- RLS: admin-only reads on gift_cards to prevent code scraping. Customers
-- never query the table directly — redemption happens via a Server Action
-- that uses the service-role client.

alter table products
  add column if not exists is_gift_card boolean not null default false,
  add column if not exists gift_card_min_amount numeric(10,2),
  add column if not exists gift_card_max_amount numeric(10,2);

create index if not exists products_is_gift_card_idx
  on products(is_gift_card)
  where is_gift_card = true;

create table if not exists gift_cards (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  initial_amount numeric(10,2) not null check (initial_amount > 0),
  balance numeric(10,2) not null check (balance >= 0),
  recipient_email text,
  recipient_name text,
  sender_name text,
  message text,
  -- The user account that owns the card. NULL when the recipient hasn't
  -- registered yet or admin issued without linking.
  issued_to_user_id uuid references profiles(id) on delete set null,
  -- Order that triggered the issuance. NULL for manual admin issuance.
  order_id uuid references orders(id) on delete set null,
  order_item_id uuid references order_items(id) on delete set null,
  expires_at timestamptz,
  delivered_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gift_cards_code_lower_idx on gift_cards (lower(code));
create index if not exists gift_cards_recipient_email_idx
  on gift_cards (lower(recipient_email))
  where recipient_email is not null;
create index if not exists gift_cards_issued_to_user_idx
  on gift_cards (issued_to_user_id)
  where issued_to_user_id is not null;
-- Idempotency: only one card per order_item (prevents double-issuance from
-- webhook + success-page race).
create unique index if not exists gift_cards_one_per_order_item
  on gift_cards (order_item_id)
  where order_item_id is not null;

drop trigger if exists gift_cards_updated_at on gift_cards;
create trigger gift_cards_updated_at before update on gift_cards
  for each row execute function set_updated_at();

create table if not exists gift_card_redemptions (
  id uuid primary key default gen_random_uuid(),
  gift_card_id uuid not null references gift_cards(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create index if not exists gift_card_redemptions_card_idx
  on gift_card_redemptions(gift_card_id);
create index if not exists gift_card_redemptions_order_idx
  on gift_card_redemptions(order_id);

alter table orders
  add column if not exists gift_card_amount numeric(10,2) not null default 0,
  -- The card pending redemption when the order is paid. Stored at order
  -- creation; the actual gift_card_redemptions row is inserted only when
  -- payment is approved, so an abandoned order doesn't consume balance.
  add column if not exists gift_card_id uuid
    references gift_cards(id) on delete set null;

alter table gift_cards enable row level security;
alter table gift_card_redemptions enable row level security;

drop policy if exists "gift_cards_admin_read" on gift_cards;
create policy "gift_cards_admin_read"
  on gift_cards for select using (is_admin());

drop policy if exists "gift_cards_admin_write" on gift_cards;
create policy "gift_cards_admin_write"
  on gift_cards for all using (is_admin()) with check (is_admin());

drop policy if exists "gift_card_redemptions_admin_read" on gift_card_redemptions;
create policy "gift_card_redemptions_admin_read"
  on gift_card_redemptions for select using (is_admin());

drop policy if exists "gift_card_redemptions_admin_write" on gift_card_redemptions;
create policy "gift_card_redemptions_admin_write"
  on gift_card_redemptions for all using (is_admin()) with check (is_admin());
