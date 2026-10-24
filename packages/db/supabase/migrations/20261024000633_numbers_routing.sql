-- Routing per number (docs/23 §3 phase 5; build contract docs/23c). EXPAND ONLY: one new table, three
-- nullable / defaulted columns, one new view. Nothing reads them while settings.comms_source = 'legacy'
-- (the default, and staging's value): the sender, the webhook and the inbox keep today's line rules
-- byte for byte. No row is inserted or copied, no secret is touched, and it never reads or writes
-- public.settings (messaging_enabled, auto_messages_enabled, crm_cutover_done, comms_source, …).
-- Idempotent: safe to run twice.

set local lock_timeout = '5s';

-- A template's own number (null = its role's default number, i.e. message_templates.line). A catalogue
-- row's notification_rules.number_id (migration 632) comes first; this is the next step of the order.
alter table public.message_templates
  add column if not exists number_id uuid references public.wa_numbers (id) on delete set null;

-- Fallback order inside a role when the chosen number is off (lower first; ties by created_at).
alter table public.wa_numbers
  add column if not exists fallback_rank smallint not null default 100
  check (fallback_rank between 0 and 999);

-- One Meta template per WABA: the approval of a template key on one number, written by the per-number
-- sync (the same result on every number that shares that number's waba_id). No row = not synced yet.
create table if not exists public.message_template_numbers (
  template_key text not null references public.message_templates (key) on delete cascade on update cascade,
  number_id uuid not null references public.wa_numbers (id) on delete cascade,
  status public.template_status not null default 'not_submitted',
  meta_id text check (meta_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  quality text check (char_length(quality) <= 40),
  last_error text check (char_length(last_error) <= 500),
  last_checked_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (template_key, number_id)
);
create index if not exists message_template_numbers_number_idx on public.message_template_numbers (number_id);

drop trigger if exists message_template_numbers_updated_at on public.message_template_numbers;
create trigger message_template_numbers_updated_at before update on public.message_template_numbers
  for each row execute function public.set_updated_at();

-- RLS (rule 9): admins read; only the API (service role) writes, like every messaging table.
alter table public.message_template_numbers enable row level security;
drop policy if exists message_template_numbers_admin_read on public.message_template_numbers;
create policy message_template_numbers_admin_read on public.message_template_numbers for select to authenticated
  using (public.is_admin());
revoke all on public.message_template_numbers from anon;
revoke insert, update, delete, truncate, references, trigger on public.message_template_numbers from authenticated;

-- Per-(phone, number) reply windows: the newest inbound row per phone and number. Rows stamped with a
-- number (module mode) give that number's window; rows with no number (history, legacy) give one row per
-- line (number_id null, a null line counting as notifications, as in v_threads), so the API credits ONLY
-- unstamped history to a role's default number. v_threads is unchanged.
create or replace view public.v_thread_numbers with (security_invoker = true) as
  select phone_e164, number_id, coalesce(line, 'notifications'::public.wa_line) as line,
    max(created_at) as last_inbound_at
  from public.messages
  where direction = 'inbound'
  group by phone_e164, number_id, coalesce(line, 'notifications'::public.wa_line);
revoke all on public.v_thread_numbers from anon, authenticated;
grant select on public.v_thread_numbers to service_role;

-- The window lookup reads one phone's inbound rows by number.
create index if not exists messages_inbound_phone_number_idx on public.messages (phone_e164, number_id, created_at desc)
  where direction = 'inbound';

-- MANUAL ROLLBACK (only after the code rollback):
--   drop index if exists public.messages_inbound_phone_number_idx;
--   drop view if exists public.v_thread_numbers;
--   drop table if exists public.message_template_numbers;
--   alter table public.wa_numbers drop column if exists fallback_rank;
--   alter table public.message_templates drop column if exists number_id;
