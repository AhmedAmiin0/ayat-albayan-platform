-- Our copy of each template the academy CRM holds (owner 2026-11-07: «the reminder is not right,
-- it's different from what the teacher really receives»). A row sent through the CRM driver goes
-- by the CRM's own template (teacher_lesson_reminder, report_session, …), whose text can differ
-- from the platform registry row of the message's key: the inbox renders such a row from this copy
-- with the values actually sent. Keyed by the CRM's name + language, not by our key: one CRM
-- template can stand for several keys, and the old report flow sends names with no registry row.
--   components: the CRM row as Meta components (HEADER / BODY / FOOTER / BUTTONS), as listed by
--   GET templates on the crm line's sync («مزامنة», the boot check and a daily refresh).
-- Written by the API's service role only; admins may read it. Expand-only and re-runnable.

set local lock_timeout = '5s';

create table if not exists public.crm_template_copies (
  name text not null check (char_length(name) between 1 and 512),
  language text not null check (char_length(language) between 1 and 20),
  components jsonb not null default '[]'::jsonb check (jsonb_typeof(components) = 'array'),
  synced_at timestamptz not null default now(),
  primary key (name, language)
);

alter table public.crm_template_copies enable row level security;
revoke all on public.crm_template_copies from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.crm_template_copies from authenticated;
drop policy if exists crm_template_copies_admin_read on public.crm_template_copies;
create policy crm_template_copies_admin_read on public.crm_template_copies
  for select to authenticated using ((select public.is_admin()));
