-- Structured opening hours per branch.
--
-- Shape:
--   {
--     "mon": [{ "open": "09:00", "close": "14:00" },
--             { "open": "16:00", "close": "19:00" }],
--     "tue": [{ "open": "09:00", "close": "17:00" }],
--     "sun": []
--   }
--
-- Each key is a weekday short code (mon..sun). Each value is an array of
-- time slots (HH:mm strings). An empty array = closed that day. Multiple
-- slots per day model the typical Mexican lunch-hour break.
--
-- The legacy `hours` text column is kept for backward compatibility — any
-- branch whose hours_schedule is empty falls back to rendering that text
-- as-is. Once a branch is re-saved through admin, hours_schedule becomes
-- the canonical source.

alter table branches
  add column if not exists hours_schedule jsonb not null default '{}'::jsonb;
