-- Promo codes (manual entry at checkout).
--
-- Reuses the `promotions` table from 0001 — that table was always meant for
-- codes (it already has `code`, `usage_limit`, `times_used`). We add:
--   - `label`        : public-facing copy shown in chips on the receipt
--   - `min_subtotal` : minimum cart subtotal to qualify
--   - `updated_at`   : audit + trigger
-- and extend `discount_type` to also support `free_shipping` so codes can
-- mirror what auto-rules can do.
--
-- Security: the previous policy allowed any anon to SELECT all active rows
-- (leaks valid codes). We tighten to admin-only reads — code validation at
-- checkout runs through a Server Action using the service-role client.

-- 1. Extend the discount type enum.
alter type discount_type add value if not exists 'free_shipping';

-- 2. New columns on `promotions`.
alter table promotions
  add column if not exists label text,
  add column if not exists min_subtotal numeric(10,2),
  add column if not exists updated_at timestamptz not null default now();

-- Backfill label from description (or code) for any pre-existing rows.
update promotions
   set label = coalesce(label, description, code)
 where label is null;

alter table promotions
  alter column label set not null;

drop trigger if exists promotions_updated_at on promotions;
create trigger promotions_updated_at before update on promotions
  for each row execute function set_updated_at();

-- 3. Tighten RLS — admin-only read so codes don't leak.
drop policy if exists "promotions_public_read_active" on promotions;
drop policy if exists "promotions_admin_read" on promotions;
create policy "promotions_admin_read"
  on promotions for select using (is_admin());
-- The existing "promotions_admin_write" policy from 0002 is unchanged.

-- 4. Speed up lookup by code.
create index if not exists promotions_code_lower_idx
  on promotions (lower(code));
