-- The crm driver's per-template name (owner 2026-10-25: «add a similar integration» to the old Google Apps
-- Script, docs/19-messaging-drivers.md «crm driver»). The academy CRM holds the old script's templates; most
-- share our meta_name, some do not (teacher_new_student = the CRM's teacher_lesson_v2, report_ready = the
-- CRM's report_session / report_trial_session after the PDF).
--
-- message_templates.crm_name / crm_language: what the crm driver sends INSTEAD of meta_name / language, read
-- only while the template's line is on crm (null = the code's default, else meta_name / language). Set by the
-- admin on «القوالب» (PUT /messaging/templates/:key/crm-name, templates.manage, audited
-- template_crm_name_set). Never written by a sync.
--
-- Expand-only and idempotent: two nullable columns, no row written; the previous API ignores them.

set local lock_timeout = '5s';

alter table public.message_templates
  add column if not exists crm_name text,
  add column if not exists crm_language text;

-- Meta's name rules and a language code, like the API's schema (templateCrmNameSchema). The table holds a
-- few dozen rows: NOT VALID + VALIDATE keeps the lock short anyway.
alter table public.message_templates drop constraint if exists message_templates_crm_name_check;
alter table public.message_templates add constraint message_templates_crm_name_check
  check (crm_name is null or crm_name ~ '^[a-z0-9_]{1,512}$') not valid;
alter table public.message_templates validate constraint message_templates_crm_name_check;

alter table public.message_templates drop constraint if exists message_templates_crm_language_check;
alter table public.message_templates add constraint message_templates_crm_language_check
  check (crm_language is null or crm_language ~ '^[a-z]{2,3}(_[A-Z]{2})?$') not valid;
alter table public.message_templates validate constraint message_templates_crm_language_check;

comment on column public.message_templates.crm_name is
  'Template name the crm driver sends instead of meta_name, only while the line is on crm; null = default. Set by the admin, audited.';
comment on column public.message_templates.crm_language is
  'Language the crm driver sends instead of language, only while the line is on crm; null = language.';

-- RLS / grants: unchanged (RLS on since migration 141; authenticated has no write grant: only the API's
-- service role writes these columns).
--
-- MANUAL ROLLBACK (only after the code rollback):
--   alter table public.message_templates drop column if exists crm_name, drop column if exists crm_language;
