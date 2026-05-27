-- Add shipping tracking info to orders.
-- Filled in by admin when changing status to "shipped". The customer sees the
-- carrier + guide on their order detail and, when we recognize the carrier,
-- a "Rastrear envío" link.

alter table orders
  add column if not exists tracking_number text,
  add column if not exists carrier text;
