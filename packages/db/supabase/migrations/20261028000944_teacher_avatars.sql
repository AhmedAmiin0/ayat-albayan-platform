-- Staff photos everywhere (owner 2026-10-28): most teachers have no login, so their photo cannot live on
-- public.profiles. teachers.avatar_path holds one uploaded by an admin, in the same private `avatars`
-- bucket under avatars/teachers/<teacher_id>/avatar-<ms>.<ext>. A teacher's photo is its linked
-- profile's avatar_path when set, else this one (the API resolves it and signs a short-lived URL).
--
-- Writes: admins only. public.teachers already allows writes to admins alone (teachers_admin; a teacher
-- only reads her own row), and the API writes with the service role behind teachers.write. The bucket's
-- policies (migration 20261012000370) already let only admins read a folder that is not the caller's
-- own uid; nobody writes `teachers/…` directly.
--
-- Idempotent and expand-only: the previous API never reads or writes the column.
-- Rollback: alter table public.teachers drop column avatar_path;

set local lock_timeout = '5s';

alter table public.teachers add column if not exists avatar_path text;

-- Only a path in the teacher's own folder: a client-sent path of another folder is refused here too.
alter table public.teachers drop constraint if exists teachers_avatar_path_own;
alter table public.teachers add constraint teachers_avatar_path_own
  check (avatar_path is null
         or (char_length(avatar_path) between 1 and 200
             and split_part(avatar_path, '/', 1) = 'teachers'
             and split_part(avatar_path, '/', 2) = id::text
             and split_part(avatar_path, '/', 3) like 'avatar-%'));
