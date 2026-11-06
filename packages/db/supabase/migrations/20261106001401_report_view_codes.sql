-- The report page's WhatsApp code (owner 2026-11-06, docs/19 «Report flow»): a viewer who is not
-- signed in gets a code on the phone ON FILE of the lesson's teacher or the student's family. It
-- reuses login_codes (the same HMAC with LOGIN_CODE_PEPPER, expiry, attempts, per-phone limits and
-- the site-wide breaker): purpose 'report_view', subject 'report' (lesson_reports.id), so a code
-- for one report never opens another.
--
-- Widens two check constraints only (the names migration 771's inline checks got). NOT VALID, then
-- VALIDATE: no long lock (every existing row already passes). Idempotent. RLS unchanged
-- (login_codes: RLS on, no client access, migration 771).
-- MANUAL ROLLBACK (after the code rollback, and after deleting the report_view rows):
--   restore both checks without 'report_view' / 'report'.

set local lock_timeout = '5s';

alter table public.login_codes drop constraint if exists login_codes_purpose_check;
alter table public.login_codes add constraint login_codes_purpose_check
  check (purpose in ('sign_in', 'reset_password', 'set_password', 'report_view')) not valid;
alter table public.login_codes validate constraint login_codes_purpose_check;

alter table public.login_codes drop constraint if exists login_codes_subject_kind_check;
alter table public.login_codes add constraint login_codes_subject_kind_check
  check (subject_kind in ('guardian', 'student', 'profile', 'report')) not valid;
alter table public.login_codes validate constraint login_codes_subject_kind_check;
