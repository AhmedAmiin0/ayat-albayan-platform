-- Two WhatsApp lines (docs/12 §13). messages.line = the business line a row was received on /
-- sent from. Nullable, NO default, NO backfill: null = history from before lines existed (or a
-- single-line deployment); `add column ... default 'notifications'` would relabel all history.
--
-- Expand-only: the previous API / web / mobile ignore both the column and the appended view column,
-- so a code rollback needs no SQL (docs/12 §13.15). Apply this migration BEFORE the new API:
-- the sender's DUE_COLUMNS, the media lookup and the thread list read messages.line, and
-- deploy-staging runs `migrate` before `deploy` (never ship this release with `migrate` unticked).

-- Fail fast instead of queueing behind a long transaction: a waiting ACCESS EXCLUSIVE request would
-- block every webhook insert and inbox read on messages. If it times out, rerun the migration.
-- (SET LOCAL only warns outside a transaction block; the migration runner executes the file as one.)
set local lock_timeout = '5s';

create type public.wa_line as enum ('notifications', 'chat');

alter table public.messages add column line public.wa_line;

comment on column public.messages.line is
  'Business line of this row (inbound: received on, outbound: sent from). Written only while the chat line is configured; null = history / single line.';

-- v_threads + last_inbound_line (line of the newest inbound row, null when that row has no line)
-- + last_chat_inbound_at / last_notifications_inbound_at (newest inbound per line; a row without a
-- line counts as notifications), the two 24 h windows of replyLine() (docs/12 §13.3 rule 2).
-- create or replace keeps the 142 grants and may only APPEND columns, so the select list is
-- explicit (m.* would put a new CTE column in the middle) and the new columns are LAST, in this
-- order. The 20 existing columns keep name, type and order (types.ts v_threads.Row). array_agg keeps NULL lines,
-- so a newest inbound row without a line yields null (never an older row's line); the id tiebreak
-- makes the pick deterministic for two inbound rows with the same created_at (Meta stamps seconds).
create or replace view public.v_threads with (security_invoker = true) as
with last_message as (
  select distinct on (phone_e164) phone_e164, id as last_message_id, direction as last_direction,
    body as last_body, template_key as last_template_key, status as last_status,
    media_mime as last_media_mime, created_at as last_message_at
  from public.messages
  order by phone_e164, created_at desc
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

-- Belt and braces: replace keeps these, repeating them is idempotent (service_role only, as in 142).
revoke all on public.v_threads from anon, authenticated;
grant select on public.v_threads to service_role;

-- MANUAL ROLLBACK (never applied automatically; level 3 of docs/12 §13.15, only after the previous
-- API is back). CREATE OR REPLACE VIEW cannot drop a column, so recreate the view from migration
-- 20261001000142_messaging.sql (its select, verbatim) BEFORE dropping the column it reads:
--
--   drop view public.v_threads;
--   create view public.v_threads with (security_invoker = true) as
--   with last_message as (
--     select distinct on (phone_e164) phone_e164, id as last_message_id, direction as last_direction,
--       body as last_body, template_key as last_template_key, status as last_status,
--       media_mime as last_media_mime, created_at as last_message_at
--     from public.messages
--     order by phone_e164, created_at desc
--   ), inbound as (
--     select phone_e164, max(created_at) as last_inbound_at,
--       (count(*) filter (where read_at is null))::int as unread_count
--     from public.messages
--     where direction = 'inbound'
--     group by phone_e164
--   )
--   select m.*, i.last_inbound_at, coalesce(i.unread_count, 0) as unread_count,
--     l.id as lead_id, l.name as lead_name, l.status as lead_status, l.source as lead_source,
--     g.id as guardian_id, g.name as guardian_name, g.tz as guardian_tz,
--     t.id as teacher_id, t.display_name_ar as teacher_name,
--     coalesce(g.name, l.name, t.display_name_ar) as display_name
--   from last_message m
--   left join inbound i on i.phone_e164 = m.phone_e164
--   left join public.leads l on l.phone_e164 = m.phone_e164
--   left join public.guardians g on g.phone_e164 = m.phone_e164
--   left join public.teachers t on t.phone_e164 = m.phone_e164;
--   revoke all on public.v_threads from anon, authenticated;
--   grant select on public.v_threads to service_role;
--   alter table public.messages drop column line;
--   drop type public.wa_line;
