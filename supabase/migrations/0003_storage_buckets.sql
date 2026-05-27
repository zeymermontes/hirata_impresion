-- Storage buckets for Hirata.
-- Run after the schema migrations.

-- Public bucket for product images, banners, category covers, templates.
insert into storage.buckets (id, name, public)
values ('public-assets', 'public-assets', true)
on conflict (id) do nothing;

-- Private bucket for files uploaded by customers (designs, source artwork).
insert into storage.buckets (id, name, public)
values ('customer-uploads', 'customer-uploads', false)
on conflict (id) do nothing;

-- public-assets: anyone can read; only admins can write
create policy "public_assets_read"
  on storage.objects for select
  using (bucket_id = 'public-assets');

create policy "public_assets_admin_write"
  on storage.objects for insert
  with check (bucket_id = 'public-assets' and is_admin());

create policy "public_assets_admin_update"
  on storage.objects for update
  using (bucket_id = 'public-assets' and is_admin())
  with check (bucket_id = 'public-assets' and is_admin());

create policy "public_assets_admin_delete"
  on storage.objects for delete
  using (bucket_id = 'public-assets' and is_admin());

-- customer-uploads: users can read/write only inside their own folder (auth.uid()/...)
create policy "customer_uploads_owner_read"
  on storage.objects for select
  using (
    bucket_id = 'customer-uploads'
    and (
      is_admin()
      or (auth.uid() is not null and (storage.foldername(name))[1] = auth.uid()::text)
    )
  );

create policy "customer_uploads_owner_write"
  on storage.objects for insert
  with check (
    bucket_id = 'customer-uploads'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "customer_uploads_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'customer-uploads'
    and (
      is_admin()
      or (auth.uid() is not null and (storage.foldername(name))[1] = auth.uid()::text)
    )
  );
