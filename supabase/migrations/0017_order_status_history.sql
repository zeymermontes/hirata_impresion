-- Audit log of every order status change. Both system-driven transitions
-- (MercadoPago webhook, /api/payment/process, /checkout/success) and admin
-- manual edits write a row. The order detail page renders this history
-- as a timeline so customer support can answer "what happened with my
-- order on day X?" without digging through logs.
--
-- `changed_by_user_id` is NULL when the system made the change. When it's
-- set, joining `profiles` gives the admin's full_name for display.
-- `source` distinguishes which automated path fired the change.

create table if not exists order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  from_status order_status,
  to_status order_status not null,
  -- NULL = automated/system change. Set to the admin's user id when the
  -- transition came from /admin/pedidos/[id] status changer.
  changed_by_user_id uuid references profiles(id) on delete set null,
  -- Free-text label for *where* the change came from (e.g. 'admin',
  -- 'mp_webhook', 'mp_process', 'checkout_success', 'system'). Useful for
  -- debugging without parsing user_id presence.
  source text not null,
  -- Optional human note (e.g. "marked paid manually because MP retried").
  note text,
  created_at timestamptz not null default now()
);

create index if not exists order_status_history_order_idx
  on order_status_history(order_id, created_at desc);

alter table order_status_history enable row level security;

drop policy if exists "order_status_history_admin_read" on order_status_history;
create policy "order_status_history_admin_read"
  on order_status_history for select using (is_admin());

drop policy if exists "order_status_history_owner_read" on order_status_history;
create policy "order_status_history_owner_read"
  on order_status_history for select using (
    exists (
      select 1 from orders o
      where o.id = order_status_history.order_id and o.user_id = auth.uid()
    )
  );

drop policy if exists "order_status_history_admin_write" on order_status_history;
create policy "order_status_history_admin_write"
  on order_status_history for all using (is_admin()) with check (is_admin());
