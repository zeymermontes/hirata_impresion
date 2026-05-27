-- Add a per-category flag so the admin can choose which categories appear
-- in the public site header navigation.

alter table categories
  add column if not exists show_in_header boolean not null default false;

-- Partial index speeds up the header query that filters by show_in_header.
create index if not exists categories_header_idx
  on categories(sort_order)
  where show_in_header = true;
