-- Add a `cta_band` section type so the admin can edit / reposition / hide
-- the yellow call-to-action band at the bottom of the landing.
--
-- Backward compat: the landing page keeps rendering the legacy hardcoded
-- CTA band whenever no `cta_band` section exists in home_sections (active
-- or inactive). Adding a row of this type takes over; toggling it off
-- hides the CTA entirely.

alter type home_section_type add value if not exists 'cta_band';
