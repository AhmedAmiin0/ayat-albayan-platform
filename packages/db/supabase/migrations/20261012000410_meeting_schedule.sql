-- Scheduled meetings (R-MEET-01, owner 2026-10-12): «اجتماع داخلي» (migration 193) may now be booked
-- ahead. starts_at null = an instant meeting (as before); a scheduled one has starts_at and
-- planned_end_at (never ends_at: that stays the «إنهاء» stamp) and its join window follows the lesson
-- rules (settings.join_opens_before_min / join_closes_after_min). cancelled_at = «ألغِ الاجتماع»:
-- nobody joins after it. client_request_id makes a retried POST /meetings return the first row (rule 8).
-- Re-runnable.
alter table public.meetings add column if not exists starts_at timestamptz;
alter table public.meetings add column if not exists planned_end_at timestamptz;
alter table public.meetings add column if not exists cancelled_at timestamptz;
alter table public.meetings add column if not exists client_request_id uuid;

alter table public.meetings drop constraint if exists meetings_schedule_shape;
alter table public.meetings add constraint meetings_schedule_shape check (
  (starts_at is null and planned_end_at is null)
  or (starts_at is not null and planned_end_at is not null and planned_end_at > starts_at)
);

create unique index if not exists meetings_client_request_uidx on public.meetings (created_by, client_request_id)
  where client_request_id is not null;
create index if not exists meetings_starts_at_idx on public.meetings (starts_at)
  where starts_at is not null;

-- Clients read the new times too (never the hash, never the request id).
grant select (starts_at, planned_end_at, cancelled_at) on public.meetings to authenticated;
