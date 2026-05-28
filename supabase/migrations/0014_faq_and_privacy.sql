-- FAQ entries and a seed row for the privacy policy.
--
-- FAQ is a collection (multiple Q&A items, sorted), so it gets its own
-- table. The privacy policy is a single document, so it lives in
-- `site_settings` under the key `privacy_policy` — same convention as
-- the existing `contact` row.

create table if not exists faq_entries (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  -- HTML-allowed (rendered server-side, only admins can write).
  answer text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists faq_entries_sort_idx
  on faq_entries(sort_order)
  where active = true;

drop trigger if exists faq_entries_updated_at on faq_entries;
create trigger faq_entries_updated_at before update on faq_entries
  for each row execute function set_updated_at();

alter table faq_entries enable row level security;

drop policy if exists "faq_entries_public_read" on faq_entries;
create policy "faq_entries_public_read"
  on faq_entries for select using (active or is_admin());

drop policy if exists "faq_entries_admin_write" on faq_entries;
create policy "faq_entries_admin_write"
  on faq_entries for all using (is_admin()) with check (is_admin());

-- Seed an empty privacy policy so the storefront route renders something
-- before the admin edits it (rather than 404'ing).
insert into site_settings (key, value)
values (
  'privacy_policy',
  jsonb_build_object(
    'content',
    '<p>Este aviso de privacidad se publicar&aacute; pronto. Mientras tanto, escr&iacute;benos a hola@hirata.mx para cualquier duda sobre el tratamiento de tus datos.</p>'
  )
)
on conflict (key) do nothing;
