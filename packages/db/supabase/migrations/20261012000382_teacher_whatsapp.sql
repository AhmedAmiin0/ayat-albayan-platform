-- The teacher's new-student alert (owner 2026-10-12: on a new booking, notify the TEACHER in-app AND by
-- a new WhatsApp template; «make the whats app notification for teacher configurable so it could be
-- disabled»). R-NOT-03, docs/12 §6.1.
--
-- 1. teacher_new_student: a utility template on the notifications line, status not_submitted. It is
--    submitted to Meta only by the admin (POST /messaging/templates/:key/submit), never here, and the
--    API queues it only once Meta approved it. {{1}} the student, {{2}} the first lesson in the
--    teacher's tz, {{3}} «تجريبية» or «اشتراك».
-- 2. Two switches in /admin/settings («الرسائل والواتساب»), both ON by default:
--    teacher_whatsapp_new_student (the template above) and teacher_whatsapp_lesson_reminder (the
--    teacher_lesson_reminder* the reminders job queues). OFF = nothing is queued to the teacher on
--    WhatsApp; the bell (in-app) alert and the guardians' messages are unchanged.
--
-- Idempotent: an existing row (the admin edited it, or Meta's sync updated it) is kept.

insert into public.message_templates
  (key, meta_name, category, line, params, buttons, body_ar, footer_ar) values
  ('teacher_new_student', 'teacher_new_student', 'utility', 'notifications',
   '["student_name", "lesson_when", "lesson_kind"]', '[]',
   'السلام عليكم ورحمة الله 🌿
انضم إلى حلقاتك طالب جديد: {{1}}.
موعد أول حلقة: {{2}}
نوع الحجز: {{3}}
تجد التفاصيل في صفحتك على منصة الأكاديمية.', 'أكاديمية آيات البيان')
on conflict (key) do nothing;

insert into public.settings (key, value) values
  ('teacher_whatsapp_new_student', 'true'::jsonb),
  ('teacher_whatsapp_lesson_reminder', 'true'::jsonb)
on conflict (key) do nothing;

-- MANUAL ROLLBACK (only after the code rollback):
--   delete from public.settings where key in ('teacher_whatsapp_new_student', 'teacher_whatsapp_lesson_reminder');
--   delete from public.message_templates where key = 'teacher_new_student' and status = 'not_submitted';
