-- report_ready goes as the WABA's approved session_report_pdf (owner 2026-11-05, docs/19 «Report flow»):
-- a DOCUMENT header (the report PDF) and four body values: {{1}} the student, {{2}} the lesson date
-- (dd/MM/yyyy in the guardian's tz), {{3}} the teacher's display name, {{4}} the family's feedback link.
-- crm_name / crm_language is the WABA name the crm driver sends today; the meta driver sends it once the
-- notifications line leaves the CRM with PR #622 (one WABA-name resolution for every driver). The body below
-- is the platform's own copy (its {{n}} count is what the send path checks: a row queued before this
-- change has two values and is refused, never sent with the wrong ones). Status approved: the template
-- is approved on the WABA. Only the report_ready row is touched. Idempotent.
-- MANUAL ROLLBACK: update public.message_templates set crm_name = null, crm_language = null,
--   status = 'missing' where key = 'report_ready';  (the constraint fix below stays)

-- Fix of migration 680's crm_name check: '{1,512}' is over Postgres's regex repetition limit (255), so
-- the check failed («invalid repetition count(s)») for ANY non-null crm_name, an admin's
-- «عدّل اسمه في نظام CRM» included. Same rule (Meta's name characters, 1-512 long), length counted
-- apart. No row changes; every existing crm_name is null.
set local lock_timeout = '5s';
alter table public.message_templates drop constraint if exists message_templates_crm_name_check;
alter table public.message_templates add constraint message_templates_crm_name_check
  check (crm_name is null or (char_length(crm_name) between 1 and 512 and crm_name ~ '^[a-z0-9_]+$'))
  not valid;
alter table public.message_templates validate constraint message_templates_crm_name_check;

update public.message_templates
   set crm_name = 'session_report_pdf',
       crm_language = 'ar',
       header_format = 'document',
       params = '["student_name", "lesson_date", "teacher_name", "feedback_link"]'::jsonb,
       buttons = '[]'::jsonb,
       body_ar = 'السلام عليكم ورحمة الله وبركاته
مرفق تقرير حلقة {{1}} بتاريخ {{2}} مع المعلم/ة {{3}}.
يسعدنا أن تشاركونا رأيكم: {{4}}',
       status = 'approved'
 where key = 'report_ready';
