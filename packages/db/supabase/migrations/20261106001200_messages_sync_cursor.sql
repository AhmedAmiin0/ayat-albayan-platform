-- Plan B «on-phone store» (owner 2026-11-06, docs/43 §5, row 43-5): the cursor GET /threads/sync
-- pages on. messages had no updated_at, so a status, edit, delete, reaction or hide could not be
-- found without re-reading whole chats; and a row DELETEd (a cancelled reminder, an adopted app
-- send, a follow-up) left no trace a phone could see.
--   1. messages.updated_at timestamptz not null default now(): one ALTER, a fast default (now() is
--      stable: stored once in the catalog, no table rewrite).
--   2. Backfill, once (only while the stamp trigger does not exist yet, so a re-run never moves a row
--      back): the row's latest own timestamp, else created_at. ~20k rows rewritten (~1-2 s with
--      search_text) under the ALTER's lock; lock_timeout keeps the sender from queueing behind it.
--      The two statement triggers that react to any UPDATE (realtime broadcast 860, thread_summaries
--      921) are paused for it only: nothing a reader sees changes. ALTER … DISABLE TRIGGER is
--      transactional: other sessions never see them off.
--   3. A BEFORE UPDATE row trigger, monotonic per row: clock_timestamp() (not now(), the start of a
--      long transaction) and never at or before the old stamp, so a later write always sorts later.
--   4. Index (updated_at, id): the sync keyset.
--   5. message_tombstones: every deleted message's id and chat, stamped (statement trigger, one insert
--      per DELETE). The sync reads it beside messages with the same keyset; service role only (RLS on,
--      no policy for anyone else). Rows are tiny and deletes rare: no purge yet.
-- RLS on messages is untouched. Re-runs safely.
-- ROLLBACK (manual, after the code rollback):
--   drop trigger if exists messages_tombstones on public.messages;
--   drop trigger if exists messages_set_updated_at on public.messages;
--   drop function if exists public.messages_record_tombstones();
--   drop function if exists public.messages_touch_updated_at();
--   drop table if exists public.message_tombstones;
--   drop index if exists public.messages_updated_at_id_idx;
--   alter table public.messages drop column if exists updated_at;
set local lock_timeout = '5s';

alter table public.messages
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_trigger
     where tgrelid = 'public.messages'::regclass and tgname = 'messages_set_updated_at'
  ) then
    alter table public.messages disable trigger messages_inbox_live_update;
    alter table public.messages disable trigger thread_summaries_update;
    update public.messages
       set updated_at = coalesce(
         greatest(sent_at, delivered_at, read_at, edited_at, deleted_at, our_reaction_at, hidden_at),
         created_at);
    alter table public.messages enable trigger messages_inbox_live_update;
    alter table public.messages enable trigger thread_summaries_update;
  end if;
end $$;

create or replace function public.messages_touch_updated_at() returns trigger
  language plpgsql set search_path = '' as $$
begin
  new.updated_at := greatest(pg_catalog.clock_timestamp(), old.updated_at + interval '1 microsecond');
  return new;
end $$;
revoke all on function public.messages_touch_updated_at() from public, anon, authenticated;

create or replace trigger messages_set_updated_at before update on public.messages
  for each row execute function public.messages_touch_updated_at();

-- Not concurrently: the migration runs in a transaction; 20k rows build in well under a second.
create index if not exists messages_updated_at_id_idx on public.messages (updated_at, id);

create table if not exists public.message_tombstones (
  id uuid primary key,
  phone_e164 text not null,
  deleted_at timestamptz not null default pg_catalog.clock_timestamp()
);
create index if not exists message_tombstones_deleted_at_id_idx
  on public.message_tombstones (deleted_at, id);
alter table public.message_tombstones enable row level security;
revoke all on public.message_tombstones from anon, authenticated;

create or replace function public.messages_record_tombstones() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  insert into public.message_tombstones (id, phone_e164)
  select o.id, o.phone_e164 from old_rows o
  on conflict (id) do update
    set phone_e164 = excluded.phone_e164, deleted_at = pg_catalog.clock_timestamp();
  return null;
end $$;
revoke all on function public.messages_record_tombstones() from public, anon, authenticated;

create or replace trigger messages_tombstones after delete on public.messages
  referencing old table as old_rows for each statement
  execute function public.messages_record_tombstones();
