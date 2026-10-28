-- A dedicated calls number (docs/28 §10, owner 2026-10-27). Expand only; no existing row is changed.
--   * Reply windows: a message a family sends to the calls number is stored with line = 'calls' (it shows in
--     their thread with the word «خط المكالمات») and must never open the notifications window (the calls
--     number never sends a regular message, so a reply from another number would fail, Meta 131047).
--     v_threads (migration 930's body) and thread_summary_refresh (migration 921's body) change ONLY that
--     filter; columns, names, types and order are unchanged. No 'calls' row exists before this deploy, so
--     nothing needs recomputing.
--   * message_templates.line is never 'calls' (a check; no template row has it today).
--   * wa_call_permissions: the family's answer to a call permission request (webhook
--     call_permission_reply), one row per (calls number's Meta phone_number_id, phone), with its expiry.
--     API only, like wa_call_sdp: RLS on with no policy, no client grant, not in the realtime publication.
-- Idempotent.

set local lock_timeout = '5s';

create table if not exists public.wa_call_permissions (
  phone_number_id text not null check (phone_number_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  phone_e164 public.e164 not null,
  response text not null check (response in ('accepted', 'rejected')),
  -- accepted: when WhatsApp says the permission lapses; null = permanent or not given.
  expires_at timestamptz,
  replied_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (phone_number_id, phone_e164)
);
alter table public.wa_call_permissions enable row level security;
revoke all on public.wa_call_permissions from anon, authenticated;

-- A template is never on the calls line (it never sends one): pinned for the API's narrowed TemplateRow.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'message_templates_line_not_calls') then
    alter table public.message_templates add constraint message_templates_line_not_calls
      check (line <> 'calls') not valid;
    alter table public.message_templates validate constraint message_templates_line_not_calls;
  end if;
end $$;

create or replace view public.v_threads with (security_invoker = true) as
with last_message as (
  select distinct on (phone_e164) phone_e164, id as last_message_id, direction as last_direction,
    body as last_body, template_key as last_template_key, status as last_status,
    media_mime as last_media_mime, created_at as last_message_at
  from public.messages
  where not public.message_is_reaction(interactive_payload)
  order by phone_e164, created_at desc
), inbound as (
  select phone_e164, max(created_at) as last_inbound_at,
    (count(*) filter (where read_at is null and not public.message_is_reaction(interactive_payload)))::int as unread_count,
    (array_agg(line order by created_at desc, id desc))[1] as last_inbound_line,
    max(created_at) filter (where line = 'chat') as last_chat_inbound_at,
    max(created_at) filter (where line is distinct from 'chat' and line is distinct from 'calls')
      as last_notifications_inbound_at
  from public.messages
  where direction = 'inbound'
  group by phone_e164
)
select m.phone_e164, m.last_message_id, m.last_direction, m.last_body, m.last_template_key,
  m.last_status, m.last_media_mime, m.last_message_at,
  i.last_inbound_at, coalesce(i.unread_count, 0) as unread_count,
  l.id as lead_id, l.name as lead_name, l.status as lead_status, l.source as lead_source,
  g.id as guardian_id, g.name as guardian_name, g.tz as guardian_tz,
  t.id as teacher_id, t.display_name_ar as teacher_name,
  coalesce(g.name, l.name, t.display_name_ar) as display_name,
  i.last_inbound_line, i.last_chat_inbound_at, i.last_notifications_inbound_at
from last_message m
left join inbound i on i.phone_e164 = m.phone_e164
left join public.leads l on l.phone_e164 = m.phone_e164
left join public.guardians g on g.phone_e164 = m.phone_e164
left join public.teachers t on t.phone_e164 = m.phone_e164;
revoke all on public.v_threads from anon, authenticated;
grant select on public.v_threads to service_role;

create or replace function public.thread_summary_refresh(p_phone text) returns void
  language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(850, hashtext(p_phone));
  insert into public.thread_summaries as s (phone_e164, last_message_id, last_direction, last_body,
    last_template_key, last_status, last_media_mime, last_message_at, last_inbound_at, unread_count,
    last_inbound_line, last_chat_inbound_at, last_notifications_inbound_at)
  select p_phone, l.id, l.direction, l.body, l.template_key, l.status, l.media_mime, l.created_at,
    i.last_inbound_at, coalesce(i.unread_count, 0), i.last_inbound_line, i.last_chat_inbound_at,
    i.last_notifications_inbound_at
  from (
    select m.id, m.direction, m.body, m.template_key, m.status, m.media_mime, m.created_at
    from public.messages m where m.phone_e164 = p_phone
    order by m.created_at desc, m.id desc limit 1
  ) l
  cross join (
    select max(m.created_at) as last_inbound_at,
      (count(*) filter (where m.read_at is null))::int as unread_count,
      (array_agg(m.line order by m.created_at desc, m.id desc))[1] as last_inbound_line,
      max(m.created_at) filter (where m.line = 'chat') as last_chat_inbound_at,
      max(m.created_at) filter (where m.line is distinct from 'chat' and m.line is distinct from 'calls')
        as last_notifications_inbound_at
    from public.messages m where m.phone_e164 = p_phone and m.direction = 'inbound'
  ) i
  on conflict (phone_e164) do update set
    last_message_id = excluded.last_message_id, last_direction = excluded.last_direction,
    last_body = excluded.last_body, last_template_key = excluded.last_template_key,
    last_status = excluded.last_status, last_media_mime = excluded.last_media_mime,
    last_message_at = excluded.last_message_at, last_inbound_at = excluded.last_inbound_at,
    unread_count = excluded.unread_count, last_inbound_line = excluded.last_inbound_line,
    last_chat_inbound_at = excluded.last_chat_inbound_at,
    last_notifications_inbound_at = excluded.last_notifications_inbound_at, updated_at = now();
  if not found then
    delete from public.thread_summaries where phone_e164 = p_phone;
  end if;
end $$;

-- MANUAL ROLLBACK (only after the code rollback): restore v_threads from migration 20261028000930 and
-- thread_summary_refresh from 20261028000921 (verbatim), then:
--   alter table public.message_templates drop constraint if exists message_templates_line_not_calls;
--   drop table if exists public.wa_call_permissions;
