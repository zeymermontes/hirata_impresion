-- Hirata — Row Level Security
-- Customers can only see their own data. Admins (profiles.role = 'admin')
-- have full read/write. Public catalog content is readable by anyone.

-- Helper: is the current user an admin?
create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================
-- profiles
-- ============================================================
alter table profiles enable row level security;

create policy "profiles_self_read"
  on profiles for select using (id = auth.uid() or is_admin());
create policy "profiles_self_update"
  on profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_admin_write"
  on profiles for all using (is_admin()) with check (is_admin());

-- ============================================================
-- addresses
-- ============================================================
alter table addresses enable row level security;

create policy "addresses_owner_all"
  on addresses for all
  using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());

-- ============================================================
-- branches (public read, admin write)
-- ============================================================
alter table branches enable row level security;

create policy "branches_public_read"
  on branches for select using (active or is_admin());
create policy "branches_admin_write"
  on branches for all using (is_admin()) with check (is_admin());

-- ============================================================
-- categories, products, product_variants, customization_fields
-- public read for active products; admins full access
-- ============================================================
alter table categories enable row level security;
create policy "categories_public_read" on categories for select using (true);
create policy "categories_admin_write" on categories for all using (is_admin()) with check (is_admin());

alter table products enable row level security;
create policy "products_public_read" on products for select
  using (status = 'active' or is_admin());
create policy "products_admin_write" on products for all using (is_admin()) with check (is_admin());

alter table product_variants enable row level security;
create policy "variants_public_read" on product_variants for select
  using (
    exists (
      select 1 from products p
      where p.id = product_id and (p.status = 'active' or is_admin())
    )
  );
create policy "variants_admin_write" on product_variants for all using (is_admin()) with check (is_admin());

alter table customization_fields enable row level security;
create policy "custom_fields_public_read" on customization_fields for select using (true);
create policy "custom_fields_admin_write" on customization_fields for all using (is_admin()) with check (is_admin());

-- ============================================================
-- banners + home_sections (public read of active, admin write)
-- ============================================================
alter table banners enable row level security;
create policy "banners_public_read" on banners for select using (
  active and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at > now())
  or is_admin()
);
create policy "banners_admin_write" on banners for all using (is_admin()) with check (is_admin());

alter table home_sections enable row level security;
create policy "home_sections_public_read" on home_sections for select using (active or is_admin());
create policy "home_sections_admin_write" on home_sections for all using (is_admin()) with check (is_admin());

-- ============================================================
-- carts & cart_items
-- ============================================================
alter table carts enable row level security;
create policy "carts_owner"
  on carts for all
  using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());

alter table cart_items enable row level security;
create policy "cart_items_owner"
  on cart_items for all
  using (
    exists (select 1 from carts c where c.id = cart_id and (c.user_id = auth.uid() or is_admin()))
  )
  with check (
    exists (select 1 from carts c where c.id = cart_id and (c.user_id = auth.uid() or is_admin()))
  );

-- ============================================================
-- orders & order_items
-- ============================================================
alter table orders enable row level security;
create policy "orders_owner_read" on orders for select using (user_id = auth.uid() or is_admin());
create policy "orders_owner_insert" on orders for insert with check (user_id = auth.uid());
create policy "orders_admin_update" on orders for update using (is_admin()) with check (is_admin());

alter table order_items enable row level security;
create policy "order_items_owner_read" on order_items for select
  using (
    exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_admin()))
  );
create policy "order_items_admin_write" on order_items for all using (is_admin()) with check (is_admin());

-- ============================================================
-- promotions (public can validate code; admins manage)
-- ============================================================
alter table promotions enable row level security;
create policy "promotions_public_read_active" on promotions for select
  using (active or is_admin());
create policy "promotions_admin_write" on promotions for all using (is_admin()) with check (is_admin());
