-- Every room is recorded (owner, 2026-10-05: «I need all the meetings to be recorded»): an internal
-- meeting («اجتماع داخلي», room `meeting-<id>`, migration 193) is recorded like a lesson (189), by
-- the same LiveKit room-composite egress into the private bucket `recordings`, under
-- meetings/<meeting id>/<timestamp>.mp4. A recording row belongs to exactly one lesson or one
-- meeting. The API (service role) stays the only writer; the admin reads every row (189), the
-- meeting's creator reads that meeting's rows; downloads go through the API's 1-hour signed URLs.
alter table public.lesson_recordings
  alter column lesson_id drop not null,
  add column meeting_id uuid references public.meetings (id) on delete cascade,
  add constraint lesson_recordings_one_owner check ((lesson_id is null) <> (meeting_id is null));

create index lesson_recordings_meeting_idx on public.lesson_recordings (meeting_id, started_at)
  where meeting_id is not null;
-- At most one running recording per meeting, as per lesson (lesson_recordings_one_running_uidx).
create unique index lesson_recordings_meeting_running_uidx on public.lesson_recordings (meeting_id)
  where status = 'recording' and meeting_id is not null;

create policy lesson_recordings_meeting_creator_read on public.lesson_recordings for select
  to authenticated using (
    meeting_id is not null
    and exists (
      select 1 from public.meetings m
      where m.id = lesson_recordings.meeting_id and m.created_by = (select auth.uid())
    )
  );
