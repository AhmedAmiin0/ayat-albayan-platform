-- Owner 2026-10-12 «make all the teachers available 24/7»: booking (slots, check, book, reschedule,
-- instant, makeup, edit time, rule generation) treats every teacher as free 00:00-24:00 every day
-- (AvailabilityQueries.bookableSlots). Clashes with lessons and teacher_time_off still block.
-- teacher_availability rows are kept, not rewritten (real data; the teacher calendars are Apps
-- Script mirrors): switching settings.teachers_always_available off on /admin/settings restores them.
-- Automatic follow-up proposals keep reading the saved grids. No DDL: settings already has RLS.
insert into public.settings (key, value) values ('teachers_always_available', 'true'::jsonb)
on conflict (key) do nothing;
