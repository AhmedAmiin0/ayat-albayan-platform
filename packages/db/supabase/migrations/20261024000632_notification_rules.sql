-- Notification rules (docs/23 §3 phase 4, amended by docs/26 §6 row 23-P4; build contract docs/23b).
-- Code defines what exists (packages/shared notifications/catalogue.ts); this table stores the admin's
-- choices per catalogue key. EXPAND ONLY: a new table, a new permission row per role, and the copy of the
-- 6 rows that mirror a legacy settings key (RULE_LEGACY_MAP) from today's values. It READS public.settings
-- and never writes it; it never reads or writes messaging_enabled, auto_messages_enabled,
-- crm_cutover_done or comms_source. Producers keep reading the legacy keys while comms_source = legacy.
-- Idempotent: safe to run twice (create if not exists, on conflict do nothing).

set local lock_timeout = '5s';

create table if not exists public.notification_rules (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{1,63}$'),
  enabled boolean not null,
  -- null = the entry's own channels; a subset of whatsapp / bell / push (the API checks it against the entry).
  channels text[] check (
    channels is null
    or (cardinality(channels) between 1 and 3 and channels <@ array['whatsapp', 'bell', 'push']::text[])
  ),
  -- null = the entry's default timing; the API validates it with the key's own schema (RULE_TIMING_SCHEMAS).
  timing jsonb check (timing is null or (jsonb_typeof(timing) = 'object' and octet_length(timing::text) <= 2048)),
  -- null = the template's own number (routing per number is phase 5).
  number_id uuid references public.wa_numbers (id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

drop trigger if exists notification_rules_updated_at on public.notification_rules;
create trigger notification_rules_updated_at before update on public.notification_rules
  for each row execute function public.set_updated_at();

-- RLS (rule 9): admins read; only the API (service role) writes, like wa_numbers.
alter table public.notification_rules enable row level security;
drop policy if exists notification_rules_admin_read on public.notification_rules;
create policy notification_rules_admin_read on public.notification_rules for select to authenticated
  using (public.is_admin());
revoke all on public.notification_rules from anon;
revoke insert, update, delete, truncate, references, trigger on public.notification_rules from authenticated;

-- «الإشعارات»: the new grantable permission notifications.manage, for the system admin (who holds every
-- grantable key in the API anyway; the row is for readers) and for every role that holds settings.write
-- today (docs/26 §2f), so custom roles keep what they can do. Reading needs settings.read.
insert into public.role_permissions (role_id, permission)
select r.id, 'notifications.manage' from public.roles r where r.is_system and r.key in ('admin')
on conflict do nothing;
insert into public.role_permissions (role_id, permission)
select distinct rp.role_id, 'notifications.manage' from public.role_permissions rp where rp.permission = 'settings.write'
on conflict do nothing;

-- The copy (docs/23 §2e step 3): each mapped row from today's value, or the registry default when the key
-- is missing, JSON null or malformed (wrong JSON type, out of bounds, not a whole number; follow_up_hours:
-- not a non-empty strictly ascending list of ≤ 5 whole numbers in 1..720), exactly as readSettings() reads
-- it (settings/validate.ts). Each coalesce default below equals SETTING_DEFAULTS (pinned by a test).
-- Every CASE checks the JSON type before a cast, so a malformed row never fails the migration.
with s as (
  select key, value from public.settings
  where key in ('reminder_minutes_before', 'reminder_24h_enabled', 'teacher_whatsapp_new_student',
    'teacher_whatsapp_lesson_reminder', 'follow_up_hours', 'follow_up_slots_from_hours',
    'follow_up_slots_to_days', 'feedback_mode')
),
num as (
  select key, case when jsonb_typeof(value) = 'number' then (value #>> '{}')::numeric end as n from s
),
whole as (
  select key, case when n = trunc(n) and n between 0 and 100000 then n::int end as i from num
),
flag as (
  select key, case when jsonb_typeof(value) = 'boolean' then (value #>> '{}')::boolean end as b from s
),
fh_el as (
  select a.o, case when jsonb_typeof(a.e) = 'number' then (a.e #>> '{}')::numeric end as n
  from s, jsonb_array_elements(case when jsonb_typeof(s.value) = 'array' then s.value else '[]'::jsonb end)
    with ordinality as a(e, o)
  where s.key = 'follow_up_hours'
),
fh_lag as (
  select o, n, lag(n) over (order by o) as prev from fh_el
),
fh_ok as (
  select array_agg(n order by o) as hours from fh_lag
  having count(*) between 1 and 5
    and bool_and(n is not null and n = trunc(n) and n between 1 and 720 and (prev is null or n > prev))
),
v as (
  select
    coalesce((select i from whole where key = 'reminder_minutes_before' and i between 5 and 720), 60) as reminder_minutes_before,
    coalesce((select b from flag where key = 'reminder_24h_enabled'), false) as reminder_24h_enabled,
    coalesce((select b from flag where key = 'teacher_whatsapp_new_student'), true) as teacher_whatsapp_new_student,
    coalesce((select b from flag where key = 'teacher_whatsapp_lesson_reminder'), true) as teacher_whatsapp_lesson_reminder,
    coalesce((select hours::int[] from fh_ok), array[24, 72]) as follow_up_hours,
    coalesce((select i from whole where key = 'follow_up_slots_from_hours' and i between 1 and 168), 12) as follow_up_slots_from_hours,
    coalesce((select i from whole where key = 'follow_up_slots_to_days' and i between 1 and 30), 7) as follow_up_slots_to_days,
    coalesce((select value #>> '{}' from s where key = 'feedback_mode' and jsonb_typeof(value) = 'string'
      and value #>> '{}' in ('buttons', 'link')), 'buttons') as feedback_mode
)
insert into public.notification_rules (key, enabled, timing)
select 'lesson_reminder', true, jsonb_build_object('minutes_before', v.reminder_minutes_before) from v
union all
select 'lesson_reminder_24h', v.reminder_24h_enabled, null from v
union all
select 'teacher_lesson_reminder', v.teacher_whatsapp_lesson_reminder, null from v
union all
select 'teacher_new_student', v.teacher_whatsapp_new_student, null from v
union all
select 'follow_up_slots', true, jsonb_build_object('hours', to_jsonb(v.follow_up_hours),
  'slots_from_hours', v.follow_up_slots_from_hours, 'slots_to_days', v.follow_up_slots_to_days) from v
union all
select 'lesson_rating', v.feedback_mode = 'buttons', null from v
on conflict (key) do nothing;

-- MANUAL ROLLBACK (only after the code rollback; the legacy settings keys were never touched):
--   delete from public.role_permissions where permission = 'notifications.manage';
--   drop table public.notification_rules;
