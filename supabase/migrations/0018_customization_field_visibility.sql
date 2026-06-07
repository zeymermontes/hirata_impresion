-- Per-field visibility scope: when a customization field should only
-- appear if the customer picked one of a specific set of variants.
-- Empty array = always visible (default, no scoping).
-- Non-empty array = only visible when the selected variant id is in the
-- list.
alter table customization_fields
  add column if not exists visible_variant_ids jsonb not null default '[]'::jsonb;
