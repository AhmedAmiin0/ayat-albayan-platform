-- read-on-app-reply.sql — one-off backfill (owner, 2026-10-27: «Unread doesn't clear»).
-- A reply sent from the WhatsApp Business app or the old CRM answers the chat, as WhatsApp itself
-- treats it; since this PR the API stamps that on new replies (ExternalStore). This marks the
-- existing ones: an inbound row with read_at null that has a LATER external reply on the same phone
-- is stamped read at that reply's created_at (the earliest such reply; never in the future).
-- External reply = outbound, created_by null, attempts 0, with a wamid (as ExternalQueries.newestExternal):
-- the platform's own automatic sends always carry attempts >= 1 once sent, so they never count.
--
-- HOW TO RUN: psql (or any client that shows NOTICEs) as a privileged role. ONE transaction ending
-- with ROLLBACK (dry run): read the counts, then change the LAST line to COMMIT and run it once more.
-- Idempotent (read_at null only); sends nothing (no Meta read receipt); deletes nothing. The UPDATE
-- fires migration 860's statement trigger once (one realtime ping).
begin;

create temp table fix_answered on commit drop as
select i.id, min(o.created_at) as reply_at
from messages i
join messages o
  on o.phone_e164 = i.phone_e164
 and o.direction = 'outbound'
 and o.created_by is null
 and o.attempts = 0
 and o.wa_message_id is not null
 and o.created_at >= i.created_at
where i.direction = 'inbound'
  and i.read_at is null
group by i.id;

-- DRY RUN: how many rows / chats would be marked read.
do $$
declare
  n_rows bigint;
  n_chats bigint;
begin
  select count(*) into n_rows from fix_answered;
  select count(distinct m.phone_e164) into n_chats from messages m join fix_answered a on a.id = m.id;
  raise notice 'inbound rows to mark read: %, chats: %', n_rows, n_chats;
end $$;

update messages m
set read_at = least(a.reply_at, now())
from fix_answered a
where m.id = a.id
  and m.read_at is null;

do $$
declare
  n_left bigint;
begin
  select count(*) into n_left
  from messages i
  where i.direction = 'inbound' and i.read_at is null
    and exists (
      select 1 from messages o
      where o.phone_e164 = i.phone_e164 and o.direction = 'outbound' and o.created_by is null
        and o.attempts = 0 and o.wa_message_id is not null and o.created_at >= i.created_at
    );
  raise notice 'answered inbound rows still unread after the update (expect 0): %', n_left;
end $$;

rollback;
