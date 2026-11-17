-- «ملفات الحلقة» (owner 2026-11-17: «session/lesson assets»): files staff add to a LESSON, not to one
-- student's report, so a group lesson's file reaches every attending student once. A file is a homework
-- sheet, a voice note, a whiteboard snapshot or teacher material; staff choose per file whether the
-- student and guardian see it («يراه الطالب وولي الأمر», on by default).
--
-- Storage: the report-attachments bucket (25 MiB, images, PDF, audio; migration 122) under
-- {lesson_id}/{uuid}.{ext}; no new bucket. The API (service role) signs every upload and download.
-- Every write goes through the API (service role, which signed the upload and checked the
-- object); a retried register finds its row by the unique storage_path (on conflict do nothing).
-- RLS (rule 9, the second wall): staff read only — admins every file, a teacher their own
-- lessons' files. The family reads through the API alone (sent report + visible rule, the
-- portal's one reader), so no portal policy: authenticated family logins see no rows. Idempotent.

create table if not exists public.lesson_files (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  kind text not null check (kind in ('homework', 'voice_note', 'whiteboard', 'material')),
  title text check (title is null or char_length(title) between 1 and 120),
  mime text not null,
  size integer not null check (size > 0 and size <= 26214400),
  storage_path text not null unique,
  visible_to_family boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- The lesson page lists a lesson's files newest first; the FK is indexed (cascade deletes).
create index if not exists lesson_files_lesson_idx on public.lesson_files (lesson_id, created_at desc);
create index if not exists lesson_files_created_by_idx on public.lesson_files (created_by);

alter table public.lesson_files enable row level security;

drop policy if exists lesson_files_admin_read on public.lesson_files;
create policy lesson_files_admin_read on public.lesson_files for select to authenticated
  using ((select public.is_admin()));

drop policy if exists lesson_files_teacher_read on public.lesson_files;
create policy lesson_files_teacher_read on public.lesson_files for select to authenticated
  using (public.is_my_lesson(lesson_id));

revoke all on public.lesson_files from anon, authenticated;
grant select on public.lesson_files to authenticated;
grant all on public.lesson_files to service_role;
