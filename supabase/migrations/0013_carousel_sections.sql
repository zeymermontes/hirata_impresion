-- Carousel sections on the landing.
--
-- A `carousel` is a new home_section type. Banners are assigned to a
-- specific carousel via `banners.home_section_id` (admin picks which
-- carousel from a dropdown when creating/editing the banner). Multiple
-- carousels can coexist on the same landing — each one renders the set
-- of banners pointing at its own section row.

alter type home_section_type add value if not exists 'carousel';
alter type banner_position add value if not exists 'carousel';

alter table banners
  add column if not exists home_section_id uuid
    references home_sections(id) on delete set null;

-- Most carousel renders will look up banners by their parent section,
-- ordered by sort_order.
create index if not exists banners_home_section_idx
  on banners(home_section_id, sort_order)
  where home_section_id is not null;
