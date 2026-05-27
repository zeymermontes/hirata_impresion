-- Two features in one migration:
--
-- 1. Products can belong to multiple categories. We keep `products.category_id`
--    as the PRIMARY category (used for breadcrumbs and the admin list)
--    and add a join table `product_categories` for additional categories.
--    A product shows up in /productos?categoria=X if either:
--      - products.category_id = X, OR
--      - there is a product_categories(product_id, X) row.
--
-- 2. Banners can target a specific category. The `banners` table already had a
--    'category' value in its `position` enum but no link to which category.
--    We add `banners.category_id` so the storefront can render those banners
--    at the top of /productos?categoria=X.

-- ============================================================
-- 1. product_categories
-- ============================================================
create table if not exists product_categories (
  product_id uuid not null references products(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  primary key (product_id, category_id)
);
create index if not exists product_categories_category_idx
  on product_categories(category_id);
create index if not exists product_categories_product_idx
  on product_categories(product_id);

alter table product_categories enable row level security;

drop policy if exists "product_categories_public_read" on product_categories;
create policy "product_categories_public_read"
  on product_categories for select using (true);

drop policy if exists "product_categories_admin_write" on product_categories;
create policy "product_categories_admin_write"
  on product_categories for all
  using (is_admin())
  with check (is_admin());

-- ============================================================
-- 2. banners.category_id
-- ============================================================
alter table banners
  add column if not exists category_id uuid references categories(id) on delete cascade;

-- Partial index for the storefront's "banners for this category" query.
create index if not exists banners_category_active_idx
  on banners(category_id, sort_order)
  where category_id is not null and active = true;
