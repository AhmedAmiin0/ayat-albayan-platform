-- «القوالب» for sales and «تعديل» for the admin (owner 2026-11-14: «add the option to add or edit
-- templates on the platform for sales and admin»). docs/12 §13.21.
--
-- 1. message_templates.created_by / created_at: who wrote a template on the platform (sales
--    authoring) and when; the API counts a user's new templates of the last 24 h (5 a day).
--    Existing rows get created_by null (seeded or imported). No foreign key on purpose: the
--    registry is reference data that no truncate of profiles may cascade into (e2e resetDb, and
--    docs/12 «no foreign key points at message_templates» either way); a deleted login keeps its id.
-- 2. message_templates.approved_edits: the times the template was edited on Meta while approved,
--    kept for 30 days: Meta allows one such edit a day and 10 in 30 days.
-- 3. templates.author: grantable; the system sales role (and the admin, for readers) by default.
--    It never lifts the restricted allow-list and never opens the templates.manage routes.
--
-- Idempotent: every statement can run again. RLS on message_templates is unchanged (the API is
-- its only writer, service role).

set local lock_timeout = '5s';

alter table public.message_templates
  add column if not exists created_by uuid,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists approved_edits timestamptz[] not null default '{}';

create index if not exists message_templates_created_by_idx
  on public.message_templates (created_by, created_at)
  where created_by is not null;

comment on column public.message_templates.created_by is
  'The staff member who wrote this template on the platform (sales authoring); null = seeded or imported.';
comment on column public.message_templates.approved_edits is
  'When the template was edited on Meta while approved (last 30 days): Meta allows 1 a day, 10 in 30 days.';

insert into public.role_permissions (role_id, permission)
select r.id, 'templates.author' from public.roles r where r.is_system and r.key in ('admin', 'sales')
on conflict do nothing;

-- MANUAL ROLLBACK (after the code rollback):
--   delete from public.role_permissions where permission = 'templates.author';
--   drop index if exists public.message_templates_created_by_idx;
--   alter table public.message_templates drop column if exists approved_edits,
--     drop column if exists created_at, drop column if exists created_by;
