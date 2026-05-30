-- Digital fulfillment + gift card delivery method.
--
-- Adds a third fulfillment option `digital` for orders that don't need any
-- shipping or pickup (e.g. a cart of email-delivered gift cards). Stores
-- the chosen delivery method on each `gift_cards` row so the admin can
-- tell at a glance which cards still need physical shipping handled.

alter type fulfillment_kind add value if not exists 'digital';

alter table gift_cards
  add column if not exists delivery_method text not null default 'email'
    check (delivery_method in ('email', 'physical'));

create index if not exists gift_cards_delivery_method_idx
  on gift_cards(delivery_method);
