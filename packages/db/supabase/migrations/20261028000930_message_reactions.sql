-- WhatsApp message reactions (owner 2026-10-27: «also add hold message to emoji»). WhatsApp is 1:1:
-- at most ONE reaction from the contact and ONE from the business per message, so they are columns on
-- public.messages (no new table; RLS unchanged: admins read, only the API writes).
--   * their_reaction: the contact's emoji, set / cleared by the webhook (type reaction), no new row.
--   * our_reaction (+ _by the staff profile, _at): set at once by PUT /threads/:phone/messages/:id/reaction;
--     the send itself is an outbound row through the existing queue, marked like a call-permission
--     request: interactive_payload = {type:'reaction', reaction:{message_id, emoji}, target_id, previous}.
--   * A reaction ROW (the inbound ones stored before this change, and every reaction send) is never a
--     bubble: public.message_is_reaction() hides it from v_threads' preview and unread count (the API
--     hides it from the message list). Nothing is deleted.
--   * messages_reaction_failed: a reaction send that ends failed puts our_reaction back to what it was
--     (payload.previous), unless a newer reaction replaced it since.
--   * Realtime: a reaction change is an UPDATE of messages, already broadcast by migration 860's
--     statement-level trigger (phone only). No second path.
-- Backfill: public.messages_reaction_backfill() sets their_reaction from the stored inbound reaction rows
-- (latest per target wamid AND phone), only on targets without one; re-runnable (run it once more after
-- the API deploy for reactions the old API stored meanwhile). Count first:
--   select count(*) from public.messages where direction = 'inbound' and public.message_is_reaction(interactive_payload);
-- Idempotent.

alter table public.messages add column if not exists their_reaction text;
alter table public.messages add column if not exists our_reaction text;
alter table public.messages add column if not exists our_reaction_by uuid;
alter table public.messages add column if not exists our_reaction_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'messages_reaction_length_check') then
    alter table public.messages add constraint messages_reaction_length_check
      check (char_length(their_reaction) <= 32 and char_length(our_reaction) <= 32) not valid;
    alter table public.messages validate constraint messages_reaction_length_check;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'messages_our_reaction_by_fkey') then
    alter table public.messages add constraint messages_our_reaction_by_fkey
      foreign key (our_reaction_by) references public.profiles (id) on delete set null not valid;
    alter table public.messages validate constraint messages_our_reaction_by_fkey;
  end if;
end $$;

-- The FK side (user_references counts it): only rows that carry one.
create index if not exists messages_our_reaction_by_idx on public.messages (our_reaction_by)
  where our_reaction_by is not null;

create or replace function public.message_is_reaction(p jsonb) returns boolean
  language sql immutable set search_path = '' as $$
  select coalesce(p ->> 'type' = 'reaction', false)
$$;

-- v_threads as migration 290, the select list unchanged: a reaction row is never the preview, never unread.
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
    max(created_at) filter (where line is distinct from 'chat') as last_notifications_inbound_at
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

-- A teacher's own unread (migration 164), without reaction rows.
create or replace function public.teacher_unread(p_teacher_id uuid, p_phones text[])
  returns table (phone_e164 text, unread int)
  language sql stable set search_path = '' as $$
  select m.phone_e164::text, count(*)::int from public.messages m
  left join public.teacher_thread_reads r
    on r.teacher_id = p_teacher_id and r.phone_e164 = m.phone_e164
  where m.direction = 'inbound' and m.phone_e164::text = any (p_phones)
    and not public.message_is_reaction(m.interactive_payload)
    and m.created_at > coalesce(r.read_at, now() - interval '24 hours')
  group by m.phone_e164
$$;
revoke execute on function public.teacher_unread(uuid, text[]) from public, anon, authenticated;
grant execute on function public.teacher_unread(uuid, text[]) to service_role;

-- A failed reaction send: our_reaction back to payload.previous, only while it is still this send's emoji.
-- Never fails the status write that fired it (a warning instead).
create or replace function public.messages_reaction_failed() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare
  p jsonb := new.interactive_payload;
begin
  begin
    update public.messages t
       set our_reaction = nullif(p #>> '{previous,emoji}', ''),
           our_reaction_by = (p #>> '{previous,by}')::uuid,
           our_reaction_at = (p #>> '{previous,at}')::timestamptz
     where t.id = (p ->> 'target_id')::uuid
       and t.phone_e164 = new.phone_e164
       and t.our_reaction is not distinct from nullif(p #>> '{reaction,emoji}', '');
  exception when others then
    raise warning 'messages_reaction_failed %: % (%)', new.id, sqlerrm, sqlstate;
  end;
  return null;
end $$;
revoke all on function public.messages_reaction_failed() from public, anon, authenticated;

drop trigger if exists messages_reaction_failed on public.messages;
create trigger messages_reaction_failed after update of status on public.messages
  for each row when (
    new.status = 'failed' and old.status is distinct from 'failed' and new.direction = 'outbound'
    and public.message_is_reaction(new.interactive_payload)
  )
  execute function public.messages_reaction_failed();

-- The stored inbound reaction rows → their_reaction of the message they name (same phone), latest wins;
-- an empty emoji (a removal) leaves it null. Targets that already have one are left alone. Returns the count.
create or replace function public.messages_reaction_backfill() returns integer
  language plpgsql security definer set search_path = '' as $$
declare
  n integer;
begin
  with latest as (
    select distinct on (r.phone_e164, r.interactive_payload #>> '{reaction,message_id}')
      r.phone_e164, r.interactive_payload #>> '{reaction,message_id}' as wamid,
      nullif(r.interactive_payload #>> '{reaction,emoji}', '') as emoji
    from public.messages r
    where r.direction = 'inbound' and public.message_is_reaction(r.interactive_payload)
      and r.interactive_payload #>> '{reaction,message_id}' is not null
    order by r.phone_e164, r.interactive_payload #>> '{reaction,message_id}', r.created_at desc, r.id desc
  )
  update public.messages t
     set their_reaction = l.emoji
    from latest l
   where t.wa_message_id = l.wamid and t.phone_e164 = l.phone_e164
     and t.their_reaction is null and l.emoji is not null and char_length(l.emoji) <= 32;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.messages_reaction_backfill() from public, anon, authenticated;
grant execute on function public.messages_reaction_backfill() to service_role;

select public.messages_reaction_backfill();

-- Down (manual): restore v_threads from migration 20261010000290 and teacher_unread from 20261001000164
-- (verbatim), then:
--   drop trigger if exists messages_reaction_failed on public.messages;
--   drop function if exists public.messages_reaction_failed();
--   drop function if exists public.messages_reaction_backfill();
--   drop function if exists public.message_is_reaction(jsonb);
--   drop index if exists public.messages_our_reaction_by_idx;
--   alter table public.messages drop constraint if exists messages_our_reaction_by_fkey;
--   alter table public.messages drop constraint if exists messages_reaction_length_check;
--   alter table public.messages drop column if exists our_reaction_at, drop column if exists our_reaction_by,
--     drop column if exists our_reaction, drop column if exists their_reaction;
