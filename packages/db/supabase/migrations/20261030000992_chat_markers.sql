-- WhatsApp edits, deletes and reactions as WhatsApp shows them (owner 2026-10-30). The WhatsApp Business
-- app's actions on the chat line reach us as echoes (smb_message_echoes, Kapso's history) and were stored
-- as new bubbles «[edit]», «[revoke]», «[reaction]». Expand only; no existing row is changed here (the
-- operator's backfill, tools/scripts/chat-markers, does that after review).
--   * messages.edited_at / deleted_at: when we applied an edit / a «deleted for everyone» (now(), not
--     WhatsApp's time: the open chat's refresh picks a changed row up by it, delta.queries.ts). A deleted
--     row keeps its body for audit; the API never shows it.
--   * A marker row: an edit, revoke or reaction kept as its own row (idempotent by wa_message_id, the
--     audit) with interactive_payload {type, marker: true, target: <wamid>, text | reaction}. Hidden like
--     a reaction row: message_is_reaction() now covers the three types, so v_threads' preview and unread,
--     teacher_unread and (below) thread_summaries skip them.
--   * message_markers_apply(phone, wamid, since): applies the pending markers naming that wamid on the SAME
--     phone, oldest first: edit → body (the newest edit wins, whatever the arrival order) + edited_at;
--     revoke → deleted_at; reaction → our_reaction (outbound) / their_reaction (inbound), the newest wins.
--     Each marker is stamped applied_at (+ the body it replaced, `previous`) and never applied twice.
--   * messages_markers_on_insert: a new marker applies at once when its target is stored; a new message
--     applies the markers that arrived before it, up to 7 days old (older ones stay unapplied: dropped).
--     Never fails the insert (a warning instead).
--   * messages_content_check: an outbound row may also carry only a payload or a WhatsApp media id (an
--     echoed photo with no caption, a marker): no more «[image]» placeholder text.
-- Idempotent.

set local lock_timeout = '5s';

alter table public.messages add column if not exists edited_at timestamptz;
alter table public.messages add column if not exists deleted_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'messages_content_payload_check') then
    alter table public.messages add constraint messages_content_payload_check check (
      direction = 'inbound' or template_key is not null or body is not null or media_path is not null
      or media_id is not null or interactive_payload is not null) not valid;
    alter table public.messages validate constraint messages_content_payload_check;
    alter table public.messages drop constraint if exists messages_content_check;
  end if;
end $$;

create or replace function public.message_is_reaction(p jsonb) returns boolean
  language sql immutable set search_path = '' as $$
  select coalesce(p ->> 'type' in ('reaction', 'edit', 'revoke'), false)
$$;

-- Pending markers by target (the apply loop); applied ones drop out of the index.
create index if not exists messages_marker_pending_idx
  on public.messages (phone_e164, (interactive_payload ->> 'target'))
  where interactive_payload ->> 'marker' = 'true' and interactive_payload ->> 'applied_at' is null;

-- Is there an applied marker of this type for the target newer than p_at? (the newest one wins)
create or replace function public.message_marker_superseded(
  p_phone text, p_wamid text, p_type text, p_at timestamptz) returns boolean
  language sql stable set search_path = '' as $$
  select exists (
    select 1 from public.messages e
    where e.phone_e164 = p_phone and e.interactive_payload ->> 'marker' = 'true'
      and e.interactive_payload ->> 'target' = p_wamid and e.interactive_payload ->> 'type' = p_type
      and e.interactive_payload ->> 'applied_at' is not null and e.created_at > p_at)
$$;

create or replace function public.message_markers_apply(p_phone text, p_wamid text, p_since timestamptz)
  returns integer language plpgsql security definer set search_path = '' as $$
declare
  k record;
  t public.messages%rowtype;
  emoji text;
  n integer := 0;
begin
  if p_wamid is null then return 0; end if;
  for k in
    select m.id, m.direction, m.created_at, m.interactive_payload as p from public.messages m
    where m.phone_e164 = p_phone and m.interactive_payload ->> 'marker' = 'true'
      and m.interactive_payload ->> 'target' = p_wamid and m.interactive_payload ->> 'applied_at' is null
      and m.created_at >= p_since
    order by m.created_at, m.id
  loop
    select * into t from public.messages x
     where x.wa_message_id = p_wamid and x.phone_e164 = p_phone
       and not public.message_is_reaction(x.interactive_payload);
    if not found then return n; end if;
    if public.message_marker_superseded(p_phone, p_wamid, k.p ->> 'type', k.created_at) then
      null; -- an older edit / reaction arriving late: the newer one already stands
    elsif k.p ->> 'type' = 'edit' and t.deleted_at is null then
      update public.messages set body = coalesce(nullif(k.p ->> 'text', ''), body), edited_at = now()
       where id = t.id;
    elsif k.p ->> 'type' = 'revoke' then
      update public.messages set deleted_at = coalesce(deleted_at, now()) where id = t.id;
    elsif k.p ->> 'type' = 'reaction' then
      emoji := nullif(k.p #>> '{reaction,emoji}', '');
      if char_length(emoji) > 32 then emoji := null; end if;
      if k.direction = 'outbound' then
        update public.messages set our_reaction = emoji, our_reaction_at = now(), our_reaction_by = null
         where id = t.id;
      else
        update public.messages set their_reaction = emoji where id = t.id;
      end if;
    end if;
    update public.messages
       set interactive_payload = interactive_payload
         || jsonb_build_object('applied_at', now(), 'previous', t.body)
     where id = k.id;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.message_markers_apply(text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.message_markers_apply(text, text, timestamptz) to service_role;
revoke all on function public.message_marker_superseded(text, text, text, timestamptz)
  from public, anon, authenticated;

create or replace function public.messages_markers_on_insert() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  begin
    if new.interactive_payload ->> 'marker' = 'true' then
      perform public.message_markers_apply(new.phone_e164, new.interactive_payload ->> 'target', '-infinity');
    else
      perform public.message_markers_apply(new.phone_e164, new.wa_message_id, now() - interval '7 days');
    end if;
  exception when others then
    raise warning 'messages_markers_on_insert %: % (%)', new.id, sqlerrm, sqlstate;
  end;
  return null;
end $$;
revoke all on function public.messages_markers_on_insert() from public, anon, authenticated;

drop trigger if exists messages_markers_on_insert on public.messages;
create trigger messages_markers_on_insert after insert on public.messages
  for each row when (new.wa_message_id is not null)
  execute function public.messages_markers_on_insert();

-- thread_summary_refresh as migration 984, ONLY skipping hidden rows (marker / reaction): never the last
-- message, never unread. Columns, names and order unchanged. Existing summaries are recomputed by the
-- backfill (tools/scripts/chat-markers), not here.
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
    from public.messages m
    where m.phone_e164 = p_phone and not public.message_is_reaction(m.interactive_payload)
    order by m.created_at desc, m.id desc limit 1
  ) l
  cross join (
    select max(m.created_at) as last_inbound_at,
      (count(*) filter (where m.read_at is null and not public.message_is_reaction(m.interactive_payload)))::int
        as unread_count,
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

-- MANUAL ROLLBACK (only after the code rollback): restore message_is_reaction from migration
-- 20261028000930 and thread_summary_refresh from 20261030000984 (verbatim), then:
--   drop trigger if exists messages_markers_on_insert on public.messages;
--   drop function if exists public.messages_markers_on_insert();
--   drop function if exists public.message_markers_apply(text, text, timestamptz);
--   drop function if exists public.message_marker_superseded(text, text, text, timestamptz);
--   drop index if exists public.messages_marker_pending_idx;
--   (re-add messages_content_check as migration 142 only once no outbound row relies on the wider check)
--   alter table public.messages drop column if exists edited_at, drop column if exists deleted_at;
