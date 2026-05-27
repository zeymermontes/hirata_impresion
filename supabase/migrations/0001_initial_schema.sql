-- Hirata Impresión Digital — initial schema
-- Run in the Supabase SQL editor or via `supabase db push`.

create extension if not exists "pgcrypto";

-- ============================================================
-- Enums
-- ============================================================
create type user_role as enum ('customer', 'admin');
create type order_status as enum (
  'pending', 'paid', 'in_production', 'ready', 'shipped', 'delivered', 'cancelled'
);
create type fulfillment_kind as enum ('ship', 'pickup');
create type product_status as enum ('draft', 'active', 'archived');
create type customization_field_type as enum ('text', 'textarea', 'number', 'dropdown', 'file');
create type banner_position as enum ('hero', 'strip', 'category');
create type home_section_type as enum (
  'hero_banners', 'featured_products', 'category_grid', 'banner_strip', 'custom_html'
);
create type discount_type as enum ('percent', 'amount');

-- ============================================================
-- Profiles (1-to-1 with auth.users)
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role user_role not null default 'customer',
  created_at timestamptz not null default now()
);

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- Addresses & branches
-- ============================================================
create table addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  recipient text not null,
  street text not null,
  ext_number text,
  int_number text,
  neighborhood text,
  city text not null,
  state text not null,
  zip text not null,
  phone text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index addresses_user_idx on addresses(user_id);

create table branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  city text not null,
  phone text,
  hours text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Catalog
-- ============================================================
create table categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  parent_id uuid references categories(id) on delete set null,
  sort_order int not null default 0,
  image_url text,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  base_price numeric(10,2) not null default 0,
  category_id uuid references categories(id) on delete set null,
  is_customizable boolean not null default false,
  requires_file boolean not null default false,
  status product_status not null default 'draft',
  images jsonb not null default '[]'::jsonb,
  template_config jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_idx on products(category_id);
create index products_status_idx on products(status);

create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,
  price_delta numeric(10,2) not null default 0,
  sku text,
  stock int,
  sort_order int not null default 0
);
create index product_variants_product_idx on product_variants(product_id);

create table customization_fields (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  type customization_field_type not null,
  name text not null,
  label text not null,
  required boolean not null default false,
  options jsonb,
  price_delta_rules jsonb,
  sort_order int not null default 0,
  unique (product_id, name)
);
create index customization_fields_product_idx on customization_fields(product_id);

-- ============================================================
-- Storefront content (landing)
-- ============================================================
create table banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_url text not null,
  link_url text,
  position banner_position not null default 'hero',
  sort_order int not null default 0,
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz
);

create table home_sections (
  id uuid primary key default gen_random_uuid(),
  type home_section_type not null,
  title text,
  config jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  active boolean not null default true
);

-- ============================================================
-- Cart & orders
-- ============================================================
create table carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  guest_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_id is not null or guest_id is not null)
);
create unique index carts_user_unique on carts(user_id) where user_id is not null;
create unique index carts_guest_unique on carts(guest_id) where guest_id is not null;

create table cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references carts(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  variant_id uuid references product_variants(id) on delete set null,
  quantity int not null default 1 check (quantity > 0),
  unit_price numeric(10,2) not null,
  customization jsonb,
  uploaded_file_url text,
  preview_url text,
  created_at timestamptz not null default now()
);
create index cart_items_cart_idx on cart_items(cart_id);

create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  status order_status not null default 'pending',
  subtotal numeric(10,2) not null,
  shipping_cost numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  fulfillment fulfillment_kind not null,
  address_snapshot jsonb,
  branch_id uuid references branches(id) on delete set null,
  payment_provider text,
  payment_id text,
  payment_status text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_user_idx on orders(user_id);
create index orders_status_idx on orders(status);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null,
  variant_name text,
  quantity int not null,
  unit_price numeric(10,2) not null,
  customization jsonb,
  uploaded_file_url text,
  preview_url text
);
create index order_items_order_idx on order_items(order_id);

-- ============================================================
-- Promotions
-- ============================================================
create table promotions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  description text,
  discount_type discount_type not null,
  value numeric(10,2) not null,
  conditions jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit int,
  times_used int not null default 0,
  active boolean not null default true
);

-- ============================================================
-- Generic updated_at trigger
-- ============================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_updated_at before update on products
  for each row execute function set_updated_at();
create trigger orders_updated_at before update on orders
  for each row execute function set_updated_at();
create trigger carts_updated_at before update on carts
  for each row execute function set_updated_at();
