-- The lesson room's presence in LiveKit's order (owner 2026-11-16, review): webhooks may arrive out
-- of order or be retried, so each classroom_participants row keeps the time of the last event it
-- applied (the event's own createdAt) and an older event is ignored. Expand-only and idempotent.
-- RLS / grants: unchanged (a new column of classroom_participants keeps its admin-read policy; only
-- the API's service role writes it).
-- MANUAL ROLLBACK: alter table public.classroom_participants drop column if exists presence_at;

alter table public.classroom_participants add column if not exists presence_at timestamptz;
