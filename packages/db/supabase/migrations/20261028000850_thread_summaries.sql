-- Fast chats list (owner 2026-10-27 «the API gets slowed»): v_threads re-aggregated the whole messages
-- table on every list call (31 % of all DB time, 45–222 ms a list, twice with count=exact). This keeps
-- the messages part of each thread in thread_summaries (one row per phone), maintained by statement-level
-- triggers on messages, and recreates v_threads ON TOP of it with the same 23 columns (name, type and
-- order: create or replace refuses anything else), so the API and v_list_threads read it unchanged.
--   * Each trigger recomputes the touched phones from their own rows (messages_phone_idx,
--     messages_unread_idx): self-healing, never an increment that can drift.
--   * Concurrency: the recompute takes a per-phone advisory lock held to commit, so two transactions
--     writing one phone run their recompute one after the other, the second with a fresh snapshot
--     (read committed, a new snapshot per statement) that sees the first's rows. Locks are taken in
--     lock-key order (hashtext), so two multi-phone statements cannot deadlock on them.
--     ponytail: a transaction that writes phone A's messages, then (another statement) phone B's
--     while another does B then A can deadlock (Postgres aborts one); the API writes messages one
--     statement per request and the RPCs one family at a time. Likewise a transaction holding a message
--     row lock that then waits on a phone's lock another holds while it updates that row.
--   * The newest message is picked by (created_at desc, id desc): the old view's distinct on had no
--     tiebreak (an arbitrary row of two with the same second); now it is deterministic.
-- Idempotent: create if not exists / create or replace / drop trigger if exists + create trigger;
-- the backfill is insert … on conflict do update. The triggers are created BEFORE the backfill: create
-- trigger holds a share row exclusive lock on messages to commit, so no message is written between the
-- backfill and the triggers going live, and the backfill runs on a quiet table.

set local lock_timeout = '5s';

create table if not exists public.thread_summaries (
  phone_e164 public.e164 primary key,
  last_message_id uuid not null,
  last_direction public.message_direction not null,
  last_body text,
  last_template_key text,
  last_status public.message_status not null,
  last_media_mime text,
  last_message_at timestamptz not null,
  last_inbound_at timestamptz,
  unread_count int not null default 0 check (unread_count >= 0),
  last_inbound_line public.wa_line,
  last_chat_inbound_at timestamptz,
  last_notifications_inbound_at timestamptz,
  updated_at timestamptz not null default now()
);
-- The list's default order, and the unread badge's count (threads-unread.queries.ts).
create index if not exists thread_summaries_last_message_idx on public.thread_summaries (last_message_at desc);
create index if not exists thread_summaries_unread_idx on public.thread_summaries (phone_e164) where unread_count > 0;

-- RLS (rule 9): admins read, like messages; only the triggers (and the service role) write.
alter table public.thread_summaries enable row level security;
drop policy if exists thread_summaries_admin_read on public.thread_summaries;
create policy thread_summaries_admin_read on public.thread_summaries for select to authenticated
  using (public.is_admin());
revoke all on public.thread_summaries from anon;
revoke insert, update, delete, truncate, references, trigger on public.thread_summaries from authenticated;

-- One phone's row recomputed from its messages (none left = the row goes).
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
      max(m.created_at) filter (where m.line is distinct from 'chat') as last_notifications_inbound_at
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

-- Several phones, in lock-key order (no deadlock between two statements' triggers).
create or replace function public.thread_summary_refresh_all(p_phones text[]) returns void
  language plpgsql security definer set search_path = '' as $$
declare
  p text;
begin
  for p in select d.x from (select distinct x from unnest(p_phones) as x where x is not null) d
    order by hashtext(d.x), d.x loop
    perform public.thread_summary_refresh(p);
  end loop;
end $$;

create or replace function public.thread_summaries_on_insert() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  perform public.thread_summary_refresh_all(array(select n.phone_e164::text from new_rows n));
  return null;
end $$;

create or replace function public.thread_summaries_on_delete() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  perform public.thread_summary_refresh_all(array(select o.phone_e164::text from old_rows o));
  return null;
end $$;

-- Only changes the summary can show: who / when / direction of any row; read_at or line of an inbound
-- row; status, text, template or file of any row (a tick on the list). Every such change passes its
-- phone on, with no "is it the newest?" pre-filter: that check would read thread_summaries unlocked,
-- so a concurrent delete of the newest row could leave a stale last_status / last_body. The recompute
-- is one indexed per-phone read (one per status webhook), serialised by the per-phone advisory lock.
create or replace function public.thread_summaries_on_update() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  perform public.thread_summary_refresh_all(array(
    select unnest(array[o.phone_e164::text, n.phone_e164::text])
    from old_rows o join new_rows n on n.id = o.id
    where (o.phone_e164, o.direction, o.created_at) is distinct from (n.phone_e164, n.direction, n.created_at)
      or (n.direction = 'inbound' and (o.read_at, o.line) is distinct from (n.read_at, n.line))
      or (o.status, o.body, o.template_key, o.media_mime) is distinct from (n.status, n.body, n.template_key, n.media_mime)
  ));
  return null;
end $$;

-- truncate messages (a test reset, never the app) leaves no thread behind.
create or replace function public.thread_summaries_on_truncate() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  delete from public.thread_summaries;
  return null;
end $$;

revoke all on function public.thread_summaries_on_truncate() from public, anon, authenticated;
revoke all on function public.thread_summary_refresh(text) from public, anon, authenticated;
revoke all on function public.thread_summary_refresh_all(text[]) from public, anon, authenticated;
revoke all on function public.thread_summaries_on_insert() from public, anon, authenticated;
revoke all on function public.thread_summaries_on_delete() from public, anon, authenticated;
revoke all on function public.thread_summaries_on_update() from public, anon, authenticated;

drop trigger if exists thread_summaries_insert on public.messages;
create trigger thread_summaries_insert after insert on public.messages
  referencing new table as new_rows for each statement execute function public.thread_summaries_on_insert();
drop trigger if exists thread_summaries_update on public.messages;
create trigger thread_summaries_update after update on public.messages
  referencing old table as old_rows new table as new_rows for each statement
  execute function public.thread_summaries_on_update();
drop trigger if exists thread_summaries_delete on public.messages;
create trigger thread_summaries_delete after delete on public.messages
  referencing old table as old_rows for each statement execute function public.thread_summaries_on_delete();
drop trigger if exists thread_summaries_truncate on public.messages;
create trigger thread_summaries_truncate after truncate on public.messages
  for each statement execute function public.thread_summaries_on_truncate();

-- Backfill once (and re-runnable): every phone with a message, from the same rules as the refresh.
insert into public.thread_summaries as s (phone_e164, last_message_id, last_direction, last_body,
  last_template_key, last_status, last_media_mime, last_message_at, last_inbound_at, unread_count,
  last_inbound_line, last_chat_inbound_at, last_notifications_inbound_at)
with last_message as (
  select distinct on (phone_e164) phone_e164, id, direction, body, template_key, status, media_mime, created_at
  from public.messages
  order by phone_e164, created_at desc, id desc
), inbound as (
  select phone_e164, max(created_at) as last_inbound_at,
    (count(*) filter (where read_at is null))::int as unread_count,
    (array_agg(line order by created_at desc, id desc))[1] as last_inbound_line,
    max(created_at) filter (where line = 'chat') as last_chat_inbound_at,
    max(created_at) filter (where line is distinct from 'chat') as last_notifications_inbound_at
  from public.messages
  where direction = 'inbound'
  group by phone_e164
)
select m.phone_e164, m.id, m.direction, m.body, m.template_key, m.status, m.media_mime, m.created_at,
  i.last_inbound_at, coalesce(i.unread_count, 0), i.last_inbound_line, i.last_chat_inbound_at,
  i.last_notifications_inbound_at
from last_message m
left join inbound i on i.phone_e164 = m.phone_e164
on conflict (phone_e164) do update set
  last_message_id = excluded.last_message_id, last_direction = excluded.last_direction,
  last_body = excluded.last_body, last_template_key = excluded.last_template_key,
  last_status = excluded.last_status, last_media_mime = excluded.last_media_mime,
  last_message_at = excluded.last_message_at, last_inbound_at = excluded.last_inbound_at,
  unread_count = excluded.unread_count, last_inbound_line = excluded.last_inbound_line,
  last_chat_inbound_at = excluded.last_chat_inbound_at,
  last_notifications_inbound_at = excluded.last_notifications_inbound_at, updated_at = now();
delete from public.thread_summaries s
  where not exists (select 1 from public.messages m where m.phone_e164 = s.phone_e164);

-- v_threads on the summary: same columns, same order, same types (migration 290's list).
create or replace view public.v_threads with (security_invoker = true) as
select s.phone_e164, s.last_message_id, s.last_direction, s.last_body, s.last_template_key,
  s.last_status, s.last_media_mime, s.last_message_at,
  s.last_inbound_at, s.unread_count,
  l.id as lead_id, l.name as lead_name, l.status as lead_status, l.source as lead_source,
  g.id as guardian_id, g.name as guardian_name, g.tz as guardian_tz,
  t.id as teacher_id, t.display_name_ar as teacher_name,
  coalesce(g.name, l.name, t.display_name_ar) as display_name,
  s.last_inbound_line, s.last_chat_inbound_at, s.last_notifications_inbound_at
from public.thread_summaries s
left join public.leads l on l.phone_e164 = s.phone_e164
left join public.guardians g on g.phone_e164 = s.phone_e164
left join public.teachers t on t.phone_e164 = s.phone_e164;
revoke all on public.v_threads from anon, authenticated;
grant select on public.v_threads to service_role;

-- Its dependant, unchanged (t.* was expanded at its creation; repeated so the pair stays together).
create or replace view public.v_list_threads with (security_invoker = true) as
  select m.list_id, t.* from public.chat_list_threads m join public.v_threads t on t.phone_e164 = m.phone_e164;
revoke all on public.v_list_threads from anon, authenticated;
grant select on public.v_list_threads to service_role;

-- MANUAL ROLLBACK (only after the code rollback; v_threads first, it reads the table):
--   create or replace view public.v_threads … with migration 20261010000290_wa_lines.sql's select, verbatim;
--   drop trigger if exists thread_summaries_insert on public.messages;
--   drop trigger if exists thread_summaries_update on public.messages;
--   drop trigger if exists thread_summaries_delete on public.messages;
--   drop trigger if exists thread_summaries_truncate on public.messages;
--   drop function if exists public.thread_summaries_on_truncate(), public.thread_summaries_on_insert(), public.thread_summaries_on_update(),
--     public.thread_summaries_on_delete(), public.thread_summary_refresh_all(text[]),
--     public.thread_summary_refresh(text);
--   drop table if exists public.thread_summaries;
