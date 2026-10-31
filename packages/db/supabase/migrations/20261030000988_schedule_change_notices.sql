-- Schedule-change notices (owner 2026-10-30: «if there is a reschedule, cancel or pause, continue event
-- please notify both teacher and student»): a lesson moved or cancelled, a course paused or resumed →
-- the lesson's teacher and the student's guardian, by WhatsApp (notifications line) and in the bell.
--
-- 1. Four push_kind values for the bell / app rows (one per catalogue row).
-- 2. Four utility templates on the notifications line, Arabic, status not_submitted: that line runs the
--    crm driver, which cannot submit templates; the owner creates them in the CRM and marks each one
--    approved («معتمد في نظام CRM»). Until then the API queues nothing for them (never a free-text
--    fallback). {{1}} the recipient (teacher or guardian), {{2}} the student(s), then the time(s) in the
--    recipient's own zone.
--
-- Idempotent and expand-only: add value if not exists (no new value is used in this migration); an
-- existing template row (edited by the admin or a sync) is kept: `on conflict do nothing` covers both
-- unique keys (key, and (meta_name, language) from migration 141), as migration 460 does. The previous
-- API never writes them.

alter type public.push_kind add value if not exists 'lesson_rescheduled';
alter type public.push_kind add value if not exists 'lesson_cancelled';
alter type public.push_kind add value if not exists 'course_paused';
alter type public.push_kind add value if not exists 'course_resumed';

insert into public.message_templates
  (key, meta_name, language, category, line, status, params, buttons, body_ar, footer_ar) values
  ('lesson_rescheduled', 'lesson_rescheduled', 'ar', 'utility', 'notifications', 'not_submitted',
   '["recipient_name", "student_name", "old_time", "new_time"]', '[]',
   'السلام عليكم {{1}}،
تم تغيير موعد حلقة {{2}}.
الموعد السابق: {{3}}
الموعد الجديد: {{4}}
أكاديمية آيات البيان', null),
  ('lesson_cancelled', 'lesson_cancelled', 'ar', 'utility', 'notifications', 'not_submitted',
   '["recipient_name", "student_name", "lesson_time"]', '[]',
   'السلام عليكم {{1}}،
تم إلغاء حلقة {{2}} المحددة في {{3}}.
للاستفسار يسعدنا تواصلكم معنا.
أكاديمية آيات البيان', null),
  ('course_paused', 'course_paused', 'ar', 'utility', 'notifications', 'not_submitted',
   '["recipient_name", "student_name", "first_lesson_paused"]', '[]',
   'السلام عليكم {{1}}،
تم إيقاف حلقات {{2}} مؤقتًا ابتداءً من {{3}}.
سنبلغكم عند استئنافها.
أكاديمية آيات البيان', null),
  ('course_resumed', 'course_resumed', 'ar', 'utility', 'notifications', 'not_submitted',
   '["recipient_name", "student_name", "first_lesson_back"]', '[]',
   'السلام عليكم {{1}}،
تم استئناف حلقات {{2}}، وأول حلقة في {{3}}.
أكاديمية آيات البيان', null)
on conflict do nothing;

-- RLS / grants: unchanged (message_templates has RLS since migration 141; only the API's service role writes).
--
-- MANUAL ROLLBACK (only after the code rollback; enum values stay, as Postgres cannot drop them):
--   delete from public.message_templates
--    where key in ('lesson_rescheduled', 'lesson_cancelled', 'course_paused', 'course_resumed')
--      and status = 'not_submitted';
