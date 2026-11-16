-- The lesson room's live state (owner 2026-11-16, «الحلقة جارية الآن»): who is inside now, from
-- LiveKit's participant_joined / participant_left webhooks. classroom_participants already holds one
-- row per admission keyed by the LiveKit identity (migration 188), so it carries the presence:
--   entered_at: the first participant_joined of that identity (a reconnect keeps it);
--   left_at:    its last participant_left, cleared by a later participant_joined.
-- Inside now = entered_at is not null and left_at is null. Expand-only and idempotent.
-- RLS / grants: unchanged (new columns of classroom_participants keep its admin-read policy; only
-- the API's service role writes, and the API answers the state on the lesson payloads).
-- MANUAL ROLLBACK: drop index if exists public.classroom_participants_inside_idx;
--   alter table public.classroom_participants drop column if exists entered_at,
--   drop column if exists left_at;

alter table public.classroom_participants
  add column if not exists entered_at timestamptz,
  add column if not exists left_at timestamptz;

-- The lesson payloads read who is inside a few lessons at a time: only those rows, by lesson.
create index if not exists classroom_participants_inside_idx
  on public.classroom_participants (lesson_id, entered_at)
  where entered_at is not null and left_at is null;
