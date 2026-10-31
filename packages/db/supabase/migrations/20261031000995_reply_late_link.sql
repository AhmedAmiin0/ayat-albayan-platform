-- A reply that arrives before the message it quotes (owner 2026-10-31 «show the replied to message like
-- wa»). messages_link_reply (migration 690) links an inbound reply at its own insert, so only when the
-- quoted row is already stored. The WhatsApp Business app's echo of our message, or Kapso's catch-up
-- history, can land AFTER the family's reply: 15 replies of 7 days on staging stayed unlinked.
-- Expand only, idempotent:
--   * messages_reply_waiting_idx: the replies still waiting for their quoted row (tiny: unlinked only).
--   * messages_link_waiting_replies: when a row gets its wamid (insert, or an update of wa_message_id)
--     the replies of the SAME phone that name it and have no link yet get reply_to_message_id = this
--     row. Only that column changes; a linked reply is never re-pointed; the UPDATE runs only when a
--     reply waits (statement-level update triggers would fire on an empty UPDATE too). No loop: the
--     UPDATE sets reply_to_message_id, not wa_message_id, so this trigger does not fire again.
--   * One backfill of what is still unlinked (690's statement; re-running finds nothing left to link).
-- SQL test plan: e2e/tests/messaging/reply-late-link.sql.spec.ts (a real database, rolled back).

set local lock_timeout = '5s';

create index if not exists messages_reply_waiting_idx on public.messages (phone_e164, reply_to_wa_id)
  where reply_to_wa_id is not null and reply_to_message_id is null;

create or replace function public.messages_link_waiting_replies() returns trigger
  language plpgsql set search_path = '' as $$
begin
  if exists (
    select 1 from public.messages r
     where r.phone_e164 = new.phone_e164 and r.reply_to_wa_id = new.wa_message_id
       and r.reply_to_message_id is null and r.id <> new.id
  ) then
    update public.messages r
       set reply_to_message_id = new.id
     where r.phone_e164 = new.phone_e164 and r.reply_to_wa_id = new.wa_message_id
       and r.reply_to_message_id is null and r.id <> new.id;
  end if;
  return null;
end $$;
revoke all on function public.messages_link_waiting_replies() from public, anon, authenticated;

drop trigger if exists messages_link_waiting_replies on public.messages;
create trigger messages_link_waiting_replies after insert or update of wa_message_id on public.messages
  for each row when (new.wa_message_id is not null)
  execute function public.messages_link_waiting_replies();

-- Replies still unlinked: linked once to a quoted row of the same phone stored since.
update public.messages m
   set reply_to_message_id = q.id
  from public.messages q
 where m.reply_to_message_id is null
   and m.reply_to_wa_id is not null
   and q.wa_message_id = m.reply_to_wa_id
   and q.phone_e164 = m.phone_e164;
