-- «رد» and «إعادة توجيه» in the inbox (owner 2026-10-25). Expand-only, idempotent; no new table, so
-- messages keeps its RLS (admins read, only the API writes).
--   * messages.reply_to_message_id: the message this one answers, of the SAME chat. Ours: set by the
--     API from replyToMessageId (it keeps reply_to_wa_id = that row's wamid for Meta's context).
--     Theirs: filled by messages_link_reply from the inbound context wamid (reply_to_wa_id).
--   * messages.forwarded_from_id: the message staff forwarded this copy from (our inbox's label).
--   * Both FKs ON DELETE SET NULL (a deleted original leaves the reply / copy standing), partial
--     indexes for the FK side (only rows that carry one).
-- SQL test plan (local DB, begin … rollback):
--   1. insert an outbound row with wa_message_id 'w1', then an inbound row on the same phone with
--      reply_to_wa_id 'w1' → its reply_to_message_id is the outbound row's id.
--   2. the same inbound reply on ANOTHER phone → reply_to_message_id stays null.
--   3. delete the outbound row → the reply's reply_to_message_id becomes null, the reply stays.
--   4. run this file twice → no error, nothing duplicated.

alter table public.messages add column if not exists reply_to_message_id uuid;
alter table public.messages add column if not exists forwarded_from_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'messages_reply_to_message_id_fkey') then
    alter table public.messages add constraint messages_reply_to_message_id_fkey
      foreign key (reply_to_message_id) references public.messages (id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'messages_forwarded_from_id_fkey') then
    alter table public.messages add constraint messages_forwarded_from_id_fkey
      foreign key (forwarded_from_id) references public.messages (id) on delete set null;
  end if;
end $$;

create index if not exists messages_reply_to_message_idx on public.messages (reply_to_message_id)
  where reply_to_message_id is not null;
create index if not exists messages_forwarded_from_idx on public.messages (forwarded_from_id)
  where forwarded_from_id is not null;

-- An inbound reply names the quoted wamid only: link it to our row of the same phone (wa_message_id
-- is unique, so this is one index probe per insert that carries a context).
create or replace function public.messages_link_reply() returns trigger
  language plpgsql set search_path = '' as $$
begin
  if new.reply_to_message_id is null and new.reply_to_wa_id is not null then
    select q.id into new.reply_to_message_id
      from public.messages q
     where q.wa_message_id = new.reply_to_wa_id and q.phone_e164 = new.phone_e164;
  end if;
  return new;
end $$;

drop trigger if exists messages_link_reply on public.messages;
create trigger messages_link_reply before insert on public.messages
  for each row when (new.reply_to_wa_id is not null)
  execute function public.messages_link_reply();

-- Replies already stored: linked once (re-running finds nothing left to link).
update public.messages m
   set reply_to_message_id = q.id
  from public.messages q
 where m.reply_to_message_id is null
   and m.reply_to_wa_id is not null
   and q.wa_message_id = m.reply_to_wa_id
   and q.phone_e164 = m.phone_e164;
