-- One source for the chats list and the unread badge, and the data for «آخر نشاط» (docs/44 §2 K4, §3,
-- row P0-4; BUG4, BUG9). Expand only: two nullable columns, one partial index, replaced functions/views.
--   * v_threads re-aggregated all of messages on every list call (migration 984: 430 ms for the biggest
--     phones, docs/37) while the badge counted thread_summaries: two sources. It now reads
--     thread_summaries (one row per phone, kept by the triggers of migration 921), with every column,
--     name, type and order of 984 (930: reaction / marker rows never the preview nor unread; 974: the
--     guardian through guardian_phones; 984: the calls line never opens the notifications window).
--   * BUG9: 984's distinct on had no id tiebreak (an arbitrary row of two with the same created_at, not
--     the chat's last bubble). The summary picks (created_at desc, id desc), like the chat.
--   * thread_summaries.last_family_read_at: the newest read_at of an OUTBOUND row (the family read one
--     of ours: status webhook / manual echo). On inbound rows read_at means staff opened it: never used.
--     last_activity_at = greatest(last_inbound_at, last_family_read_at). Appended to v_threads (and
--     v_list_threads) at the END: create or replace view can only append. Not WhatsApp's last seen.
--   * thread_summary_refresh = migration 992's body plus the two columns; the update trigger now also
--     fires when only an outbound read_at changes, or a row turns into / out of a hidden marker.
--   * Backfill: every summary recomputed set-based from the same rules (also the rows migration 992
--     left to tools/scripts/chat-markers). messages is locked against writes first (share row
--     exclusive, before thread_summaries: the triggers' order, no deadlock), so no write runs the old
--     refresh between the backfill and commit.
-- Idempotent.

set local lock_timeout = '5s';

lock table public.messages in share row exclusive mode;

alter table public.thread_summaries add column if not exists last_family_read_at timestamptz;
alter table public.thread_summaries add column if not exists last_activity_at timestamptz;

-- The newest outbound read_at of a phone: one index row (the refresh runs on every status webhook).
create index if not exists messages_family_read_idx on public.messages (phone_e164, read_at desc)
  where direction = 'outbound' and read_at is not null;

create or replace function public.thread_summary_refresh(p_phone text) returns void
  language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(850, hashtext(p_phone));
  insert into public.thread_summaries as s (phone_e164, last_message_id, last_direction, last_body,
    last_template_key, last_status, last_media_mime, last_message_at, last_inbound_at, unread_count,
    last_inbound_line, last_chat_inbound_at, last_notifications_inbound_at, last_family_read_at,
    last_activity_at)
  select p_phone, l.id, l.direction, l.body, l.template_key, l.status, l.media_mime, l.created_at,
    i.last_inbound_at, coalesce(i.unread_count, 0), i.last_inbound_line, i.last_chat_inbound_at,
    i.last_notifications_inbound_at, r.last_family_read_at,
    greatest(i.last_inbound_at, r.last_family_read_at)
  from (
    select m.id, m.direction, m.body, m.template_key, m.status, m.media_mime, m.created_at
    from public.messages m
    where m.phone_e164 = p_phone and not public.message_is_reaction(m.interactive_payload)
    order by m.created_at desc, m.id desc limit 1
  ) l
  cross join (
    select max(m.created_at) as last_inbound_at,
      (count(*) filter (where m.read_at is null
        and not public.message_is_reaction(m.interactive_payload)))::int as unread_count,
      (array_agg(m.line order by m.created_at desc, m.id desc))[1] as last_inbound_line,
      max(m.created_at) filter (where m.line = 'chat') as last_chat_inbound_at,
      max(m.created_at) filter (where m.line is distinct from 'chat' and m.line is distinct from 'calls')
        as last_notifications_inbound_at
    from public.messages m where m.phone_e164 = p_phone and m.direction = 'inbound'
  ) i
  cross join (
    select max(m.read_at) as last_family_read_at
    from public.messages m
    where m.phone_e164 = p_phone and m.direction = 'outbound' and m.read_at is not null
  ) r
  on conflict (phone_e164) do update set
    last_message_id = excluded.last_message_id, last_direction = excluded.last_direction,
    last_body = excluded.last_body, last_template_key = excluded.last_template_key,
    last_status = excluded.last_status, last_media_mime = excluded.last_media_mime,
    last_message_at = excluded.last_message_at, last_inbound_at = excluded.last_inbound_at,
    unread_count = excluded.unread_count, last_inbound_line = excluded.last_inbound_line,
    last_chat_inbound_at = excluded.last_chat_inbound_at,
    last_notifications_inbound_at = excluded.last_notifications_inbound_at,
    last_family_read_at = excluded.last_family_read_at,
    last_activity_at = excluded.last_activity_at, updated_at = now();
  if not found then
    delete from public.thread_summaries where phone_e164 = p_phone;
  end if;
end $$;

-- Migration 921's rules, plus: an outbound read_at alone (the family read ours), and a row turning
-- into / out of a hidden marker (it leaves or joins the preview and the unread count).
create or replace function public.thread_summaries_on_update() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  perform public.thread_summary_refresh_all(array(
    select unnest(array[o.phone_e164::text, n.phone_e164::text])
    from old_rows o join new_rows n on n.id = o.id
    where (o.phone_e164, o.direction, o.created_at) is distinct from (n.phone_e164, n.direction, n.created_at)
      or (n.direction = 'inbound' and (o.read_at, o.line) is distinct from (n.read_at, n.line))
      or (n.direction = 'outbound' and o.read_at is distinct from n.read_at)
      or (o.status, o.body, o.template_key, o.media_mime) is distinct from (n.status, n.body, n.template_key, n.media_mime)
      or public.message_is_reaction(o.interactive_payload)
        is distinct from public.message_is_reaction(n.interactive_payload)
  ));
  return null;
end $$;
revoke all on function public.thread_summary_refresh(text) from public, anon, authenticated;
revoke all on function public.thread_summaries_on_update() from public, anon, authenticated;

-- Backfill (re-runnable): the refresh's rules, set-based, for every phone.
insert into public.thread_summaries as s (phone_e164, last_message_id, last_direction, last_body,
  last_template_key, last_status, last_media_mime, last_message_at, last_inbound_at, unread_count,
  last_inbound_line, last_chat_inbound_at, last_notifications_inbound_at, last_family_read_at,
  last_activity_at)
with last_message as (
  select distinct on (phone_e164) phone_e164, id, direction, body, template_key, status, media_mime,
    created_at
  from public.messages
  where not public.message_is_reaction(interactive_payload)
  order by phone_e164, created_at desc, id desc
), inbound as (
  select phone_e164, max(created_at) as last_inbound_at,
    (count(*) filter (where read_at is null
      and not public.message_is_reaction(interactive_payload)))::int as unread_count,
    (array_agg(line order by created_at desc, id desc))[1] as last_inbound_line,
    max(created_at) filter (where line = 'chat') as last_chat_inbound_at,
    max(created_at) filter (where line is distinct from 'chat' and line is distinct from 'calls')
      as last_notifications_inbound_at
  from public.messages
  where direction = 'inbound'
  group by phone_e164
), family_read as (
  select phone_e164, max(read_at) as last_family_read_at
  from public.messages
  where direction = 'outbound' and read_at is not null
  group by phone_e164
)
select m.phone_e164, m.id, m.direction, m.body, m.template_key, m.status, m.media_mime, m.created_at,
  i.last_inbound_at, coalesce(i.unread_count, 0), i.last_inbound_line, i.last_chat_inbound_at,
  i.last_notifications_inbound_at, r.last_family_read_at,
  greatest(i.last_inbound_at, r.last_family_read_at)
from last_message m
left join inbound i on i.phone_e164 = m.phone_e164
left join family_read r on r.phone_e164 = m.phone_e164
on conflict (phone_e164) do update set
  last_message_id = excluded.last_message_id, last_direction = excluded.last_direction,
  last_body = excluded.last_body, last_template_key = excluded.last_template_key,
  last_status = excluded.last_status, last_media_mime = excluded.last_media_mime,
  last_message_at = excluded.last_message_at, last_inbound_at = excluded.last_inbound_at,
  unread_count = excluded.unread_count, last_inbound_line = excluded.last_inbound_line,
  last_chat_inbound_at = excluded.last_chat_inbound_at,
  last_notifications_inbound_at = excluded.last_notifications_inbound_at,
  last_family_read_at = excluded.last_family_read_at,
  last_activity_at = excluded.last_activity_at, updated_at = now();
delete from public.thread_summaries s where not exists (select 1 from public.messages m
  where m.phone_e164 = s.phone_e164 and not public.message_is_reaction(m.interactive_payload));

-- v_threads on the summary: migration 984's 23 columns (name, type, order) and joins, then the two
-- activity columns. Grants and security_invoker as 984: the service role only.
create or replace view public.v_threads with (security_invoker = true) as
select s.phone_e164, s.last_message_id, s.last_direction, s.last_body, s.last_template_key,
  s.last_status, s.last_media_mime, s.last_message_at,
  s.last_inbound_at, s.unread_count,
  l.id as lead_id, l.name as lead_name, l.status as lead_status, l.source as lead_source,
  g.id as guardian_id, g.name as guardian_name, g.tz as guardian_tz,
  t.id as teacher_id, t.display_name_ar as teacher_name,
  coalesce(g.name, l.name, t.display_name_ar) as display_name,
  s.last_inbound_line, s.last_chat_inbound_at, s.last_notifications_inbound_at,
  s.last_family_read_at, s.last_activity_at
from public.thread_summaries s
left join public.leads l on l.phone_e164 = s.phone_e164
left join public.guardian_phones gp on gp.phone_e164 = s.phone_e164
left join public.guardians g on g.id = gp.guardian_id
left join public.teachers t on t.phone_e164 = s.phone_e164;
revoke all on public.v_threads from anon, authenticated;
grant select on public.v_threads to service_role;

-- Its dependant: t.* was expanded at its creation, so it is recreated to carry the appended columns
-- (list_id then v_threads' columns in order: only an append).
create or replace view public.v_list_threads with (security_invoker = true) as
  select m.list_id, t.* from public.chat_list_threads m
  join public.v_threads t on t.phone_e164 = m.phone_e164;
revoke all on public.v_list_threads from anon, authenticated;
grant select on public.v_list_threads to service_role;

-- MANUAL ROLLBACK (only after the code rollback; nothing reads the new columns yet):
--   the appended columns cannot be removed by create or replace: drop view public.v_list_threads,
--   public.v_threads, then recreate them as 20261030000984's select / 20261020000520's, verbatim, with
--   their revokes and grants; thread_summary_refresh from 20261030000992 and thread_summaries_on_update
--   from 20261028000921, verbatim; drop index if exists public.messages_family_read_idx;
--   alter table public.thread_summaries drop column if exists last_activity_at,
--     drop column if exists last_family_read_at;
