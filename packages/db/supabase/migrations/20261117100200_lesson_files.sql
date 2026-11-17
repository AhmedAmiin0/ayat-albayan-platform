-- «ملفات الحلقة» (owner 2026-11-17: «session/lesson assets»): files staff add to a LESSON, not to one
-- student's report, so a group lesson's file reaches every attending student once. A file is a homework
-- sheet, a voice note, a whiteboard snapshot or teacher material; staff choose per file whether the
-- student and guardian see it («يراه الطالب وولي الأمر», on by default).
--
-- Storage: the report-attachments bucket (25 MiB, images, PDF, audio; migration 122) under
-- {lesson_id}/{uuid}.{ext}; no new bucket. The API (service role) signs every upload and download.
-- RLS (rule 9, the second wall): admins all; a teacher their own lessons' files (read, add);
-- a portal login (guardian or student) reads the visible files of its own students' lessons.
-- Removing a file and changing visibility go through the API only. Idempotent.

create table if not exists public.lesson_files (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  kind text not null check (kind in ('homework', 'voice_note', 'whiteboard', 'material')),
  title text check (title is null or char_length(title) between 1 and 120),
  mime text not null,
  size integer not null check (size > 0 and size <= 26214400),
  storage_path text not null,
  visible_to_family boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- The lesson page lists a lesson's files newest first; the FK is indexed (cascade deletes).
create index if not exists lesson_files_lesson_idx on public.lesson_files (lesson_id, created_at desc);
create index if not exists lesson_files_created_by_idx on public.lesson_files (created_by);

alter table public.lesson_files enable row level security;

-- A portal login's own students attend the lesson (portal_student_ids, migration 790).
create or replace function public.is_portal_lesson(p_lesson uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.lesson_students ls
                 where ls.lesson_id = p_lesson
                   and ls.student_id in (select public.portal_student_ids()))
$$;
revoke execute on function public.is_portal_lesson(uuid) from public, anon;
grant execute on function public.is_portal_lesson(uuid) to authenticated, service_role;

drop policy if exists lesson_files_admin_all on public.lesson_files;
create policy lesson_files_admin_all on public.lesson_files for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists lesson_files_teacher_read on public.lesson_files;
create policy lesson_files_teacher_read on public.lesson_files for select to authenticated
  using (public.is_my_lesson(lesson_id));

drop policy if exists lesson_files_teacher_insert on public.lesson_files;
create policy lesson_files_teacher_insert on public.lesson_files for insert to authenticated
  with check (public.is_my_lesson(lesson_id));

drop policy if exists lesson_files_portal_read on public.lesson_files;
create policy lesson_files_portal_read on public.lesson_files for select to authenticated
  using (visible_to_family and public.is_portal_lesson(lesson_id));

revoke all on public.lesson_files from anon;
grant select, insert on public.lesson_files to authenticated;
grant all on public.lesson_files to service_role;
