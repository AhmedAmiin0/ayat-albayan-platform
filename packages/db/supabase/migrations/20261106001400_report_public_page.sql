-- The report's live page and its two link templates (owner 2026-11-06, docs/19 «Report flow»).
--
-- 1. lesson_reports.public_id: the opaque id in https://app.ayatalbayan.com/report/<public_id>.
--    gen_random_uuid's 122 random bits as hex without dashes, a fresh value derived from no other
--    row, so it is never another row's uuid and never guessable. Unique. The page
--    still asks a viewer who is not signed in for a WhatsApp code (the id alone shows nothing).
--    lesson_reports holds a few dozen rows a day: the volatile default rewrites it under a short lock.
-- 2. Two UTILITY templates on the notifications line, Arabic, POSITIONAL, status not_submitted: the
--    admin submits them from «القوالب». Until a template is approved the PDF job keeps today's
--    report_ready (the PDF document) for the family and sends the teacher nothing. The URL button's
--    {{1}} is the report's public_id.
--
-- Idempotent and expand-only: add column if not exists; an existing template row (same key, or same
-- meta_name + language) is kept (`on conflict do nothing`, as migrations 460 and 988).

set local lock_timeout = '5s';

alter table public.lesson_reports
  add column if not exists public_id text not null
    default replace(gen_random_uuid()::text, '-', '');

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'lesson_reports_public_id_key') then
    alter table public.lesson_reports
      add constraint lesson_reports_public_id_key unique (public_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'lesson_reports_public_id_check') then
    alter table public.lesson_reports
      add constraint lesson_reports_public_id_check check (public_id ~ '^[0-9a-f]{32}$');
  end if;
end $$;

comment on column public.lesson_reports.public_id is
  'Opaque id of the report''s live page (/report/<public_id>); random, never shown as a credential.';

insert into public.message_templates
  (key, meta_name, language, category, line, status, params, buttons, body_ar, footer_ar) values
  ('report_ready_teacher', 'report_ready_teacher', 'ar', 'utility', 'notifications', 'not_submitted',
   '["student_name", "lesson_date"]',
   '[{"type": "url", "text": "عرض التقرير", "url": "https://app.ayatalbayan.com/report/{{1}}"}]',
   'السلام عليكم ورحمة الله وبركاته
تم حفظ تقرير حلقة الطالب/ة {{1}} بتاريخ {{2}}، ويمكنكم الاطلاع عليه من الزر أدناه.
أكاديمية آيات البيان', null),
  ('report_ready_family', 'report_ready_family', 'ar', 'utility', 'notifications', 'not_submitted',
   '["student_name", "lesson_date", "teacher_name", "feedback_link"]',
   '[{"type": "url", "text": "عرض التقرير", "url": "https://app.ayatalbayan.com/report/{{1}}"}]',
   'السلام عليكم ورحمة الله وبركاته
تقرير حلقة {{1}} بتاريخ {{2}} مع المعلم/ة {{3}} جاهز، ويمكنكم الاطلاع عليه وتنزيله من الزر أدناه.
يسعدنا أن تشاركونا رأيكم عبر الرابط {{4}} وجزاكم الله خيرًا.', null)
on conflict do nothing;

-- RLS / grants: unchanged. lesson_reports keeps its RLS (the API is its only writer, migration 120);
-- message_templates has RLS since migration 141 (admins read, only the API's service role writes).
--
-- MANUAL ROLLBACK (only after the code rollback):
--   delete from public.message_templates
--    where key in ('report_ready_teacher', 'report_ready_family') and status = 'not_submitted';
--   alter table public.lesson_reports drop column if exists public_id;
