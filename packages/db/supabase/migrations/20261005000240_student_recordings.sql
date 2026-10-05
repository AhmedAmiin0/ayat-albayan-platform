-- Recordings in the teacher-student file (owner, 2026-10-05): a lesson's recording (189, 212) is
-- listed on each attending student's file for the admin, the teacher and the assigned assistants
-- (API, service role). Additive and re-runnable:
--  * visible_to_student: OFF by default; the future student/guardian portal will read only rows
--    where it is true. No guardian policy yet: a group lesson's file is one file for every
--    student, so exposing it is a portal decision (the API also refuses to show a group recording);
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

-- No guardian read policy yet (the portal task adds it, with its own privacy rules). Drops the
-- one an earlier run of this migration created: it exposed a whole group file and its egress id.
-- Staff reads and writes go through the API (service role); no write policy.
drop policy if exists lesson_recordings_guardian_read on public.lesson_recordings;

-- recordings.manage (show/hide a recording to the student, delete it): a write permission apart
-- from recordings.read, so a read-only role cannot delete files. Today's access: the admin and
-- the teacher (parity with the old @Roles); deleting stays admin-base in the service. Seeded here,
-- not in 220, so a database that already ran 220 gets it too (the system admin holds every key in
-- the API whatever its rows say).
insert into public.role_permissions (role_id, permission)
select r.id, 'recordings.manage' from public.roles r where r.is_system and r.key in ('admin', 'teacher')
on conflict do nothing;
