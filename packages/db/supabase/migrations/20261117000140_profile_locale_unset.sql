-- «اللغة» from the API (owner 2026-11-16, review): profiles.locale was `not null default 'ar'`
-- (migration 0002), so "never chosen" read as Arabic and a login that picked English on its device
-- or browser was switched back to Arabic. Before this PR the only writer was the admin's «المستخدمون»
-- (create: the 'ar' default unless picked; edit: a pick), so a stored 'ar' cannot be told from the
-- default and is cleared, while 'en' was always a deliberate pick and is kept. null = not chosen,
-- the app keeps its own. From now on PATCH /me/locale and «المستخدمون» write it; a new login is null.
-- Expand-only for readers: the previous API never read it. Idempotent.
-- RLS / grants: unchanged (profiles keeps its policies; only the API's service role writes it).
-- MANUAL ROLLBACK: update public.profiles set locale = 'ar' where locale is null;
--   alter table public.profiles alter column locale set default 'ar', alter column locale set not null;

alter table public.profiles alter column locale drop not null, alter column locale drop default;

update public.profiles set locale = null where locale is distinct from 'en';

alter table public.profiles drop constraint if exists profiles_locale_check;
alter table public.profiles add constraint profiles_locale_check
  check (locale is null or locale in ('ar', 'en'));
