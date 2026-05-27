-- Promotion engine.
--
-- A `promotion_rule` is an auto-applied rule that evaluates against the
-- customer's cart at checkout time. Codes (manual entry) are out of scope
-- for v1 — the existing `promotions` table from 0001 can be repurposed for
-- that later.
--
-- Supported types:
--   - free_shipping  : sets shipping cost to 0 when min_subtotal is met
--   - percent_off    : discounts qualifying subtotal by N%
--   - amount_off     : discounts qualifying subtotal by $N (capped at qual subtotal)
--
-- Scope:
--   - all         : evaluates against the whole cart subtotal
--   - products    : only items in `promotion_rule_products` count
--   - categories  : only items whose primary category is in `promotion_rule_categories`

create type promotion_rule_type as enum (
  'free_shipping',
  'percent_off',
  'amount_off'
);

create type promotion_rule_scope as enum (
  'all',
  'products',
  'categories'
);

create table if not exists promotion_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- Public-facing copy. Shown to the customer as a chip/banner.
  label text not null,
  description text,
  type promotion_rule_type not null,
  -- For percent_off: 0-100. For amount_off: pesos. Ignored for free_shipping.
  discount_value numeric(10,2) not null default 0,
  -- Minimum *cart subtotal* to qualify. NULL = no minimum.
  min_subtotal numeric(10,2),
  scope promotion_rule_scope not null default 'all',
  -- Schedule. NULL means open-ended on that side.
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists promotion_rules_active_window_idx
  on promotion_rules(active, starts_at, ends_at);

drop trigger if exists promotion_rules_updated_at on promotion_rules;
create trigger promotion_rules_updated_at before update on promotion_rules
  for each row execute function set_updated_at();

create table if not exists promotion_rule_products (
  promotion_rule_id uuid not null references promotion_rules(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  primary key (promotion_rule_id, product_id)
);
create index if not exists promotion_rule_products_rule_idx
  on promotion_rule_products(promotion_rule_id);

create table if not exists promotion_rule_categories (
  promotion_rule_id uuid not null references promotion_rules(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  primary key (promotion_rule_id, category_id)
);
create index if not exists promotion_rule_categories_rule_idx
  on promotion_rule_categories(promotion_rule_id);

-- RLS: public can read active rules (so the storefront can show them);
-- writes are admin-only.
alter table promotion_rules enable row level security;
alter table promotion_rule_products enable row level security;
alter table promotion_rule_categories enable row level security;

drop policy if exists "promotion_rules_public_read" on promotion_rules;
create policy "promotion_rules_public_read"
  on promotion_rules for select using (active or is_admin());

drop policy if exists "promotion_rules_admin_write" on promotion_rules;
create policy "promotion_rules_admin_write"
  on promotion_rules for all using (is_admin()) with check (is_admin());

drop policy if exists "promotion_rule_products_public_read" on promotion_rule_products;
create policy "promotion_rule_products_public_read"
  on promotion_rule_products for select using (true);

drop policy if exists "promotion_rule_products_admin_write" on promotion_rule_products;
create policy "promotion_rule_products_admin_write"
  on promotion_rule_products for all using (is_admin()) with check (is_admin());

drop policy if exists "promotion_rule_categories_public_read" on promotion_rule_categories;
create policy "promotion_rule_categories_public_read"
  on promotion_rule_categories for select using (true);

drop policy if exists "promotion_rule_categories_admin_write" on promotion_rule_categories;
create policy "promotion_rule_categories_admin_write"
  on promotion_rule_categories for all using (is_admin()) with check (is_admin());

-- Persist applied promotions on the order so we can show them on receipts
-- and order detail pages even if the rule changes later.
alter table orders
  add column if not exists discount_amount numeric(10,2) not null default 0,
  add column if not exists applied_promotions jsonb;
