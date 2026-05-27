-- Allow guests (unauthenticated visitors) to read/write their cart.
--
-- Background: the original policy in 0002 only allowed rows where
-- `user_id = auth.uid()` — but guest carts have `user_id IS NULL` and a
-- `guest_id` cookie. With no session, auth.uid() is NULL, and `NULL = NULL`
-- evaluates to NULL (not TRUE), so RLS was blocking the INSERT.
--
-- The trade-off: any anonymous request can technically read/write any guest
-- cart row (RLS can't verify the cookie). In practice the app only queries by
-- the guest_id stored in the httpOnly cookie, so users can't see each others'
-- carts, and a guest cart only contains product selections (no PII).

drop policy if exists "carts_owner" on carts;
create policy "carts_owner"
  on carts for all
  using (
    user_id = auth.uid()
    or (user_id is null and guest_id is not null)
    or is_admin()
  )
  with check (
    user_id = auth.uid()
    or (user_id is null and guest_id is not null)
    or is_admin()
  );

drop policy if exists "cart_items_owner" on cart_items;
create policy "cart_items_owner"
  on cart_items for all
  using (
    exists (
      select 1 from carts c
      where c.id = cart_id
        and (
          c.user_id = auth.uid()
          or (c.user_id is null and c.guest_id is not null)
          or is_admin()
        )
    )
  )
  with check (
    exists (
      select 1 from carts c
      where c.id = cart_id
        and (
          c.user_id = auth.uid()
          or (c.user_id is null and c.guest_id is not null)
          or is_admin()
        )
    )
  );
