-- Students as users (owner, 2026-10-06). One login per student; the student row survives the
-- login (unlinked on delete). `student` is a base role with no permissions yet: the portal task
-- grants self.student.* later, so every API route refuses it today.
alter table public.students add column if not exists profile_id uuid references public.profiles (id) on delete set null;
create unique index if not exists students_profile_id_key on public.students (profile_id) where profile_id is not null;

-- Guardians already have profile_id unique (people migration); keep it explicit and idempotent.
create unique index if not exists guardians_profile_id_key on public.guardians (profile_id) where profile_id is not null;

-- A student reads their own row (the portal task widens this).
drop policy if exists students_self_read on public.students;
create policy students_self_read on public.students for select to authenticated
  using (profile_id = (select auth.uid()));

-- The system role of the new base role: no permissions yet. Same shape as the other system roles.
insert into public.roles (key, name_ar, name_en, base_role, is_system)
select 'student', 'طالب', 'Student', 'student', true
where not exists (select 1 from public.roles where is_system and key = 'student');

-- users.read / users.write: the system admin only (custom roles get them in the matrix).
insert into public.role_permissions (role_id, permission)
select r.id, 'users.read' from public.roles r where r.is_system and r.key in ('admin')
on conflict do nothing;
insert into public.role_permissions (role_id, permission)
select r.id, 'users.write' from public.roles r where r.is_system and r.key in ('admin')
on conflict do nothing;
