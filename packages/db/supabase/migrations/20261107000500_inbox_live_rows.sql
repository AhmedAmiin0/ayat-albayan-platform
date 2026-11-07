-- The tick in the realtime push (docs/44 P1-2 / K1; owner 2026-11-07 «still there is a delay between the
-- messages i send»). Until now each 'thread_changed' on 'inbox:staff' carried {phone} only (860), so every
-- client re-read over HTTP before ✓ could move. The event now carries, per phone, the rows the statement
-- touched: {phone, rows:[{id, s:status, d:direction, at:created_at}]}, at most 20 rows, else {phone}
-- alone. Never a body, a name, a template key or a param. A client moves the tick of a row it already
-- holds with no request; an unknown id or a {phone}-only event still re-reads as before.
--
-- Every 'inbox:staff' reader (admin and sales with inbox.read, 860) may see every row listed. A phone
-- goes out as {phone} only (no id at all) when ANY of its rows in the statement is one some reader may
-- not see, or one the tick cannot describe:
--   * a link template (inbox_link_templates(): the SQL twin of the API's LINK_TEMPLATES, hidden from
--     sales; a unit test keeps the two lists equal),
--   * a row hidden for staff (hidden_at), a reaction / edit / revoke marker row (message_is_reaction),
--   * an update that changes anything but the tick (an edit, a delete, a hide, a reaction, media,
--     an error text) or an inbound row's update (a staff read mark moves the unread count),
--   * a chat of the academy's own numbers (wa_numbers.display_phone_e164: every read hides them).
-- Teachers never join 'inbox:staff' (inbox_live_reader, 860): unchanged.
-- Size: 20 rows ≈ 2.2 KB, far under Realtime's broadcast payload limit (256 KB on the free plan).
-- Deploy: function bodies and the two triggers only; no row is read or changed.
-- SQL tests: e2e/tests/messaging/inbox-live-rows.sql.spec.ts (+ 860 / 20261107000100 specs).
-- Rollback: re-run 860's inbox_broadcast_changed and 20261107000100's inbox_broadcast_updated (both
--   call inbox_live_send again), then drop the functions created here.
set local lock_timeout = '5s';

-- Templates whose params hold a signed link (migration 187): the twin of LINK_TEMPLATES (sales-threads.ts).
create or replace function public.inbox_link_templates() returns text[]
  language sql immutable set search_path = '' as $$
  select array['lesson_feedback_request', 'lesson_join_link']
$$;

-- What a row may say in the push ({id, s, d, at}); null when not every staff reader may see it.
create or replace function public.inbox_live_row(p jsonb) returns jsonb
  language sql immutable set search_path = '' as $$
  select case when p ->> 'hidden_at' is null
      and not public.message_is_reaction(p -> 'interactive_payload')
      and not coalesce(p ->> 'template_key' = any (public.inbox_link_templates()), false)
    then jsonb_build_object('id', p -> 'id', 's', p -> 'status', 'd', p -> 'direction',
                            'at', p -> 'created_at')
  end
$$;

create or replace function public.inbox_tick_columns() returns text[]
  language sql immutable set search_path = '' as $$
  select array['status', 'sent_at', 'delivered_at', 'read_at', 'wa_message_id', 'attempts',
               'next_attempt_at', 'error_code', 'error_text', 'sent_as_text', 'updated_at',
               'wa_conversation_id', 'wa_pricing_category']
$$;

-- Columns a tick moves (the sender's claim and «sent», the status webhook with Meta's conversation
-- and pricing, which no client view shows); any other change needs a
-- body re-read. A failure, or an error code other than the sender's 'sending' lease, re-reads too (its
-- text is shown); so does an inbound row (a staff read mark moves the unread count).
create or replace function public.inbox_tick_only(p_old jsonb, p_new jsonb) returns boolean
  language sql immutable set search_path = '' as $$
  select coalesce(p_new ->> 'direction' = 'outbound' and p_new ->> 'status' <> 'failed'
    and coalesce(p_new ->> 'error_code', 'sending') = 'sending'
    and (p_old - public.inbox_tick_columns()) = (p_new - public.inbox_tick_columns()), false)
$$;

-- The event of one phone: {phone}, or {phone, rows} when there are rows to tell.
create or replace function public.inbox_live_payload(p_phone text, p_rows jsonb) returns jsonb
  language sql immutable set search_path = '' as $$
  select case when p_rows is null then jsonb_build_object('phone', p_phone)
    else jsonb_build_object('phone', p_phone, 'rows', p_rows) end
$$;

-- [{phone, row}] (row null: not tellable) → one event per phone, at most 200 phones (860's cap).
create or replace function public.inbox_live_events(p_items jsonb) returns jsonb[]
  language sql stable security definer set search_path = '' as $$
  select array_agg(public.inbox_live_payload(g.phone, case when g.tellable and not exists (
      select 1 from public.wa_numbers w where w.display_phone_e164 = g.phone) then g.rows end))
    from (
      select i ->> 'phone' as phone,
             count(*) <= 20 and bool_and(jsonb_typeof(i -> 'row') = 'object') as tellable,
             jsonb_agg(i -> 'row' order by i -> 'row' ->> 'at', i -> 'row' ->> 'id') as rows
        from jsonb_array_elements(coalesce(p_items, '[]')) i
       group by i ->> 'phone'
       limit 200
    ) g
$$;

-- The sender: one realtime.send per event. No Realtime schema (CI's e2e stack): nothing to send.
create or replace function public.inbox_live_send_events(p_events jsonb[]) returns void
  language plpgsql security definer set search_path = '' as $$
declare
  v_event jsonb;
begin
  if to_regprocedure('realtime.send(jsonb,text,text,boolean)') is null then
    return;
  end if;
  foreach v_event in array p_events loop
    perform realtime.send(v_event, 'thread_changed', 'inbox:staff', true);
  end loop;
end $$;

-- 860's insert broadcast, with the rows.
create or replace function public.inbox_broadcast_changed() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare
  v_events jsonb[];
begin
  begin
    select public.inbox_live_events(jsonb_agg(jsonb_build_object(
        'phone', c.phone_e164::text, 'row', public.inbox_live_row(to_jsonb(c)))))
      into v_events from changed c where c.phone_e164 is not null;
    if v_events is not null then
      perform public.inbox_live_send_events(v_events);
    end if;
  exception when others then
    raise warning 'inbox_broadcast_changed: % (%)', sqlerrm, sqlstate;
  end;
  return null;
end $$;

-- 20261107000100's update broadcast (a media move alone still sends nothing), with the tick rows.
create or replace function public.inbox_broadcast_updated() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare
  v_events jsonb[];
begin
  begin
    select public.inbox_live_events(jsonb_agg(jsonb_build_object('phone', c.phone_e164::text,
        'row', case when public.inbox_tick_only(to_jsonb(o), to_jsonb(c))
                    then public.inbox_live_row(to_jsonb(c)) end)))
      into v_events
      from changed c join old_rows o on o.id = c.id
     where c.phone_e164 is not null
       and not public.only_path_moved(to_jsonb(o), to_jsonb(c), 'media_path');
    if v_events is not null then
      perform public.inbox_live_send_events(v_events);
    end if;
  exception when others then
    raise warning 'inbox_broadcast_updated: % (%)', sqlerrm, sqlstate;
  end;
  return null;
end $$;

revoke all on function public.inbox_live_events(jsonb) from public, anon, authenticated;
revoke all on function public.inbox_live_send_events(jsonb[]) from public, anon, authenticated;
revoke all on function public.inbox_live_payload(text, jsonb) from public, anon, authenticated;
revoke all on function public.inbox_live_row(jsonb) from public, anon, authenticated;
revoke all on function public.inbox_broadcast_changed() from public, anon, authenticated;
revoke all on function public.inbox_broadcast_updated() from public, anon, authenticated;
