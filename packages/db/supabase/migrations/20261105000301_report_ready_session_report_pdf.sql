-- report_ready goes as the WABA's approved session_report_pdf (owner 2026-11-05, docs/19 «Report flow»):
-- a DOCUMENT header (the report PDF) and four body values: {{1}} the student, {{2}} the lesson date
-- (dd/MM/yyyy in the guardian's tz), {{3}} the teacher's display name, {{4}} the family's feedback link.
-- crm_name / crm_language is the WABA name the crm driver sends today; the meta driver sends it once the
-- notifications line leaves the CRM with PR #622 (one WABA-name resolution for every driver). The body below
-- is the platform's own copy (its {{n}} count is what the send path checks: a row queued before this
-- change has two values and is refused, never sent with the wrong ones). Status approved: the template
-- is approved on the WABA. Only the report_ready row is touched. Idempotent.
-- MANUAL ROLLBACK: update public.message_templates set crm_name = null, crm_language = null,
--   status = 'missing' where key = 'report_ready';

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
