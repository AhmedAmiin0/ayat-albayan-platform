-- Automatic messages switch (docs/09 cut-over). auto_messages_enabled: the jobs queue reminders
-- (lesson_reminder*, teacher_lesson_reminder*, lesson_reminder_24h), follow_up_slots and
-- renewal_due only when true, and the sender fails such job-made rows still queued as
-- 'auto_off' while it is false. Admin sends from the inbox, booking confirmations and
-- report_ready are not affected; the send gate (messaging_enabled + env) still governs all.
-- false until the old Apps Script reminders are stopped (they would arrive twice).
insert into public.settings (key, value) values
  ('auto_messages_enabled', 'false'::jsonb)
on conflict (key) do nothing;
