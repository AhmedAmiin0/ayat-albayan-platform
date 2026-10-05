-- Recordings in the teacher-student file (owner, 2026-10-05): a lesson's recording (189, 212) is
-- listed on each attending student's file for the admin, the teacher and the assigned assistants
-- (API, service role). Additive and re-runnable:
--  * visible_to_student: OFF by default; the future student/guardian access reads only rows where
--    it is true (the policy below is the DB half, the API has no student route yet);
--  * size_bytes: from the egress result (null for older rows); deleted_at + status 'deleted':
--    the admin's delete and the retention job (recording_retention_days, null = keep forever)
--    remove the file and keep the row for the record.
alter table public.lesson_recordings
  add column if not exists visible_to_student boolean not null default false,
  add column if not exists size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  add column if not exists deleted_at timestamptz;

alter table public.lesson_recordings drop constraint if exists lesson_recordings_status_check;
alter table public.lesson_recordings add constraint lesson_recordings_status_check
  check (status in ('recording', 'done', 'failed', 'deleted'));
alter table public.lesson_recordings drop constraint if exists lesson_recordings_deleted_check;
alter table public.lesson_recordings add constraint lesson_recordings_deleted_check
  check ((status = 'deleted') = (deleted_at is not null));

-- The stuck-recording sweeper and the retention job scan by age.
create index if not exists lesson_recordings_running_idx on public.lesson_recordings (started_at)
  where status = 'recording';
create index if not exists lesson_recordings_retention_idx on public.lesson_recordings (ended_at)
  where status in ('done', 'failed');

-- A guardian reads only a finished, undeleted recording of a lesson of their own child that the
-- staff made visible. Staff writes and reads go through the API (service role); no write policy.
drop policy if exists lesson_recordings_guardian_read on public.lesson_recordings;
create policy lesson_recordings_guardian_read on public.lesson_recordings for select
  to authenticated using (
    visible_to_student
    and status = 'done'
    and deleted_at is null
    and lesson_id is not null
    and public.is_my_child_lesson(lesson_id)
  );
