-- Dynamic configuration (owner, 2026-10-05 «add dynamic configurations»): business rules that were
-- constants in code become rows of public.settings, edited on /admin/settings. The keys, types,
-- ranges and defaults live in the settings registry (packages/shared/src/settings); the API falls
-- back to the same defaults for a missing row. Seeded with today's values, so nothing changes until
-- an admin edits them. Idempotent: an existing row (already edited) is never overwritten.
--
-- Public (GET /settings/public, no login): join_opens_before_min, join_closes_after_min,
-- makeup_window_days, upload_max_mb, academy_whatsapp_e164. The table keeps its RLS (admin read,
-- service-role write); the public subset is served by the API only.

insert into public.settings (key, value) values
  ('join_opens_before_min', '15'::jsonb),            -- classroom opens 15 min before the lesson
  ('join_closes_after_min', '120'::jsonb),           -- … and closes 2 h after it ends
  ('default_meeting_title', '"اجتماع"'::jsonb),      -- untitled «اجتماع داخلي» (column default stays)
  ('makeup_window_days', '60'::jsonb),               -- a charged miss can be made up for 60 days
  ('upload_max_mb', '10'::jsonb),                    -- receipts and invoices (bucket ceiling 10 MB)
  ('quick_reply_window_hours', '48'::jsonb),         -- a typed «نعم» matches our lesson message of the last 48 h
  ('reminder_lookahead_hours', '25'::jsonb),         -- reminders job reads 25 h ahead
  ('follow_up_slots_from_hours', '12'::jsonb),       -- follow-up slots start 12 h ahead …
  ('follow_up_slots_to_days', '7'::jsonb),           -- … and end 7 days ahead
  ('feedback_rate_window_min', '10'::jsonb),         -- public feedback form rate-limit window
  ('fx_fresh_hours', '24'::jsonb),                   -- a stored exchange rate is reused for 24 h
  ('academy_whatsapp_e164', '"+966566101447"'::jsonb),
  ('academy_timezone', '"Asia/Riyadh"'::jsonb)
on conflict (key) do nothing;
