-- Online classrooms, step 4: every lesson is recorded in full. A staff join starts a LiveKit
-- room-composite egress (grid, MP4) that uploads straight into the private bucket `recordings`
-- through the Storage S3 endpoint; the LiveKit webhook (POST /livekit/webhook) marks it done or
-- failed. The API (service role) is the only writer; the admin may read the rows, and the API
-- hands the admin and the lesson's teacher 1-hour signed URLs (GET /lessons/:id/recordings).
create table public.lesson_recordings (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  -- Null between the claim (the row is inserted before LiveKit is asked) and LiveKit's answer.
  egress_id text unique,
  status text not null default 'recording' check (status in ('recording', 'done', 'failed')),
  -- Object name in the bucket: lessons/<lesson id>/<timestamp>.mp4
  file_path text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  error text,
  check ((status = 'recording') = (ended_at is null))
);
create index lesson_recordings_lesson_idx on public.lesson_recordings (lesson_id, started_at);
-- At most one running recording per lesson: two staff joining at once start one egress.
create unique index lesson_recordings_one_running_uidx on public.lesson_recordings (lesson_id)
  where status = 'recording';

alter table public.lesson_recordings enable row level security;
create policy lesson_recordings_admin_read on public.lesson_recordings for select
  to authenticated using (public.is_admin());
revoke all on public.lesson_recordings from anon;

-- No size limit of its own (a lesson runs long): the project's global upload limit applies.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('recordings', 'recordings', false, null, array['video/mp4'])
on conflict (id) do nothing;
create policy storage_recordings_admin_read on storage.objects for select to authenticated
  using (bucket_id = 'recordings' and public.is_admin());
