-- Managed short links (docs/19 «Short links»), part 3:
-- 1. login_codes: purpose and subject kind 'short_link'. The gate's WhatsApp codes reuse the
--    family sign-in machinery (HMAC, expiry, attempts, per-phone limits, the site-wide breaker);
--    the subject id is derived from (link, phone), so one visitor's code never opens another's.
-- 2. The template short_link: UTILITY, Arabic, positional, on the NOTIFICATIONS line, status
--    not_submitted. The owner creates / submits it; until Meta approves it the API records a
--    failed send (template_not_approved) and never falls back to free text or another line.
--    {{1}} = the link's title, {{2}} = the short URL; the button opens the web gate /l/<code>.
-- 3. short_links.manage (admin, sales) and short_links.all (admin) for the system roles.
-- Idempotent and expand-only.

set local lock_timeout = '5s';

alter table public.login_codes drop constraint if exists login_codes_purpose_check;
alter table public.login_codes add constraint login_codes_purpose_check
  check (purpose in ('sign_in', 'reset_password', 'set_password', 'report_view', 'short_link'))
  not valid;
alter table public.login_codes validate constraint login_codes_purpose_check;

alter table public.login_codes drop constraint if exists login_codes_subject_kind_check;
alter table public.login_codes add constraint login_codes_subject_kind_check
  check (subject_kind in ('guardian', 'student', 'profile', 'report', 'teacher', 'short_link'))
  not valid;
alter table public.login_codes validate constraint login_codes_subject_kind_check;

insert into public.message_templates
  (key, meta_name, language, category, line, status, params, buttons, body_ar, footer_ar) values
  ('short_link', 'short_link', 'ar', 'utility', 'notifications', 'not_submitted',
   '["title", "short_url"]',
   '[{"type": "url", "text": "فتح الرابط", "url": "https://app.ayatalbayan.com/l/{{1}}"}]',
   'السلام عليكم ورحمة الله وبركاته
أرسلت إليكم أكاديمية آيات البيان رابطًا بعنوان: {{1}}
يمكنكم فتحه من الرابط {{2}} أو من الزر أدناه.', 'أكاديمية آيات البيان')
on conflict do nothing;

insert into public.role_permissions (role_id, permission)
select r.id, 'short_links.manage' from public.roles r where r.is_system and r.key in ('admin', 'sales')
on conflict do nothing;
insert into public.role_permissions (role_id, permission)
select r.id, 'short_links.all' from public.roles r where r.is_system and r.key in ('admin')
on conflict do nothing;

-- MANUAL ROLLBACK (after the code rollback):
--   delete from public.role_permissions where permission in ('short_links.manage', 'short_links.all');
--   delete from public.message_templates where key = 'short_link' and status = 'not_submitted';
--   (login_codes: restore the previous checks once no 'short_link' row is left.)
