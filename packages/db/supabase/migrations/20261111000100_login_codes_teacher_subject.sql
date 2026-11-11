-- A teacher's WhatsApp sign-in code (docs/46 A2, owner 2026-11-11): a teacher with no login gets a
-- code on teachers.phone_e164, one with a login on her profile's own phone (D2). The code's subject
-- is the teacher record (subject_kind 'teacher', subject_id = teachers.id, purpose 'sign_in'), so a
-- teacher code never opens a guardian, a student or a staff profile.
--
-- Widens one check constraint only (the name migration 771's inline check got, last widened by
-- 20261106001401). NOT VALID, then VALIDATE: no long lock (every existing row already passes).
-- Idempotent. RLS unchanged (login_codes: RLS on, no client access, migration 771).
-- MANUAL ROLLBACK (after the code rollback, and after deleting the 'teacher' rows):
--   restore the check without 'teacher' (the list of 20261106001401).

set local lock_timeout = '5s';

alter table public.login_codes drop constraint if exists login_codes_subject_kind_check;
alter table public.login_codes add constraint login_codes_subject_kind_check
  check (subject_kind in ('guardian', 'student', 'profile', 'report', 'teacher')) not valid;
alter table public.login_codes validate constraint login_codes_subject_kind_check;
