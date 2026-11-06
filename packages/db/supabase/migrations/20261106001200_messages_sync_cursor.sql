-- Plan B «on-phone store» (owner 2026-11-06, docs/43 §5, row 43-5): the cursor GET /threads/sync
-- pages on. messages had no updated_at, so a status, edit, delete, reaction or hide could not be
-- found without re-reading whole chats.
--   1. messages.updated_at timestamptz not null default now(): one ALTER, a fast default (now() is
--      stable: stored once in the catalog, no table rewrite).
--   2. Backfill: the row's latest own timestamp (sent / delivered / read / edited / deleted /
--      reacted / hidden), else created_at. ~20k rows rewritten once (~1-2 s with search_text). The
--      two statement triggers that react to an UPDATE (realtime broadcast 860, thread_summaries 921)
--      are paused for it only: nothing a reader sees changes, and 20k broadcasts / summary
--      recomputes must not go out. ALTER … DISABLE TRIGGER is transactional: other sessions never
--      see them off; lock_timeout keeps the sender from queueing behind the migration.
--   3. A BEFORE UPDATE row trigger (public.set_updated_at, migration 1): every later write moves it.
--      Created after the backfill so the backfill keeps its historic values.
--   4. Index (updated_at, id): the sync keyset.
-- RLS is untouched (no new table; messages keeps its policies). Re-runs safely.
-- ROLLBACK (manual, after the code rollback):
--   drop trigger if exists messages_set_updated_at on public.messages;
--   drop index if exists public.messages_updated_at_id_idx;
--   alter table public.messages drop column if exists updated_at;
set local lock_timeout = '5s';

alter table public.messages
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists messages_set_updated_at on public.messages;

alter table public.messages disable trigger messages_inbox_live_update;
alter table public.messages disable trigger thread_summaries_update;

update public.messages
   set updated_at = coalesce(
     greatest(sent_at, delivered_at, read_at, edited_at, deleted_at, our_reaction_at, hidden_at),
     created_at)
 where updated_at is distinct from coalesce(
     greatest(sent_at, delivered_at, read_at, edited_at, deleted_at, our_reaction_at, hidden_at),
     created_at);

alter table public.messages enable trigger messages_inbox_live_update;
alter table public.messages enable trigger thread_summaries_update;

create trigger messages_set_updated_at before update on public.messages
  for each row execute function public.set_updated_at();

-- Not concurrently: the migration runs in a transaction; 20k rows build in well under a second.
create index if not exists messages_updated_at_id_idx on public.messages (updated_at, id);
