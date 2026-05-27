-- Site-wide settings. Key/value JSON store for things the admin needs to edit
-- without code changes (contact info, social links, business hours, etc.).
--
-- Key convention: lowercase snake_case (e.g. 'contact', 'social_links').
-- Value can be any JSON: object, array, string, number.

create table if not exists site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Bump updated_at on writes so the admin can see when each setting was last
-- changed. Reuses the existing set_updated_at() trigger function from 0001.
drop trigger if exists site_settings_updated_at on site_settings;
create trigger site_settings_updated_at before update on site_settings
  for each row execute function set_updated_at();

-- RLS: anyone can read (the storefront's /contacto page reads contact info),
-- only admins can write.
alter table site_settings enable row level security;

drop policy if exists "site_settings_public_read" on site_settings;
create policy "site_settings_public_read"
  on site_settings for select using (true);

drop policy if exists "site_settings_admin_write" on site_settings;
create policy "site_settings_admin_write"
  on site_settings for all using (is_admin()) with check (is_admin());

-- Seed default contact info. Admin edits these from /admin/configuracion.
insert into site_settings (key, value)
values (
  'contact',
  jsonb_build_object(
    'email', 'hola@hirata.mx',
    'phone', '+52 55 1234 5678',
    'whatsapp', '525512345678',
    'whatsapp_label', '+52 55 1234 5678'
  )
)
on conflict (key) do nothing;
