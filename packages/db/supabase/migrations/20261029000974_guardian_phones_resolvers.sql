-- «رقم ثانٍ للعائلة» (owner 2026-10-29), part 2: the SQL readers that turn a phone into a family read
-- public.guardian_phones (migration 973), so a family's second number shows the family exactly like its main one.
--   1. v_threads: migration 930's select verbatim, only the guardians join goes through guardian_phones. Its
--      primary key is the phone, so the view keeps one row per phone; same 23 columns in the same order, so
--      create or replace is accepted and v_list_threads (t.* expanded at its creation) is untouched.
--   2. my_sales_phones (latest: migration 187): her families' numbers include their second numbers; feeds
--      messages_sales_read (187) and wa_calls_sales_read (740).
--   3. students_chat_list_auto (migration 710): a student who becomes active puts every family number into «مشترك».
-- Left on the main number on purpose: teacher_thread_phones (teacher mode), create_booking, family sign-in.
-- SQL test plan (local DB, begin … rollback):
--   1. a second number with messages → its v_threads row has the family's guardian_id / guardian_name;
--      select count(*) = count(distinct phone_e164) from public.v_threads.
--   2. as the owning assistant (set request.jwt.claims), my_sales_phones() lists the second number.
--   3. a student of a family with a second number becomes active → both numbers are in the 'subscribed' list.
-- Idempotent.

-- v_threads as migration 930, the guardian found through guardian_phones (main or second number).
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
left join public.guardian_phones gp on gp.phone_e164 = m.phone_e164
left join public.guardians g on g.id = gp.guardian_id
left join public.teachers t on t.phone_e164 = m.phone_e164;
revoke all on public.v_threads from anon, authenticated;
grant select on public.v_threads to service_role;

-- The phones of this salesperson's chats: their leads and every number of the families they own.
create or replace function public.my_sales_phones() returns table (phone_e164 text)
  language sql stable security definer set search_path = '' as $$
  select l.phone_e164::text from public.leads l where l.assigned_to = auth.uid()
  union
  select gp.phone_e164::text from public.guardian_phones gp where gp.guardian_id in (select public.my_sales_guardian_ids())
$$;
revoke execute on function public.my_sales_phones() from public, anon;
grant execute on function public.my_sales_phones() to authenticated;

-- A student becomes active (insert, status change, or moved to another guardian): every family number.
create or replace function public.students_chat_list_auto() returns trigger
  language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.chat_list_auto_add('subscribed', gp.phone_e164::text)
    from public.guardian_phones gp where gp.guardian_id = new.guardian_id;
  return null;
end $$;
revoke all on function public.students_chat_list_auto() from public, anon, authenticated;

-- Down (manual): v_threads from migration 20261028000930 (verbatim), my_sales_phones from 20261001000187 and
-- students_chat_list_auto from 20261025000710, each with its grants.
