-- Seed data for local development. Run AFTER 0001/0002/0003 migrations.
-- Replace USER_UUID below with the auth.users.id of the admin you want to promote.

-- Promote a user to admin (run from SQL editor):
-- update profiles set role = 'admin' where id = 'USER_UUID_HERE';

-- Categorías de ejemplo
insert into categories (slug, name, description, sort_order) values
  ('lonas', 'Lonas', 'Lonas de gran formato para exteriores e interiores', 1),
  ('vinilos', 'Vinilos', 'Vinilos adhesivos y de corte', 2),
  ('papeleria', 'Papelería', 'Tarjetas, volantes, trípticos y más', 3),
  ('señalizacion', 'Señalización', 'Letreros, displays y POP', 4)
on conflict (slug) do nothing;

-- Sucursal de ejemplo
insert into branches (name, address, city, phone, hours)
values (
  'Hirata Centro',
  'Av. Reforma 123, Col. Centro',
  'Ciudad de México',
  '+52 55 1234 5678',
  'Lun-Vie 9:00-19:00 · Sáb 9:00-14:00'
)
on conflict do nothing;

-- Banner hero de ejemplo
insert into banners (title, subtitle, image_url, link_url, position, sort_order)
values
  ('Impresión digital en gran formato', 'Lonas, vinilos y mucho más', 'https://placehold.co/1600x600/facc15/0a0a0a?text=HIRATA', '/productos', 'hero', 1)
on conflict do nothing;

-- Secciones de la landing (orden mostrado en la home)
insert into home_sections (type, title, config, sort_order) values
  ('hero_banners', null, '{"position":"hero"}'::jsonb, 1),
  ('featured_products', 'Productos destacados', '{"limit":8}'::jsonb, 2),
  ('category_grid', 'Categorías', '{"limit":6}'::jsonb, 3),
  ('banner_strip', 'Promociones', '{"position":"strip"}'::jsonb, 4)
on conflict do nothing;
