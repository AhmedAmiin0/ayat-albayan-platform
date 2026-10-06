-- A student reads their own record through a view of whitelisted columns (review of the
-- users-control PR). Migration 281 gave the student a row policy on public.students, which exposed
-- every column of their row through PostgREST: the staff's `notes`, `meeting_link_override`,
-- `created_by`, the guardian id. Column grants would also cut the teacher / admin policies, so the
-- row policy goes and a definer view (rows of auth.uid() only) takes its place. The portal task
-- reads this view. Idempotent.
drop policy if exists students_self_read on public.students;

create or replace view public.student_self with (security_invoker = false) as
  select s.id, s.code, s.name, s.age, s.gender, s.level, s.program, s.riwaya, s.memorized, s.goal,
    s.status, s.teacher_id, s.tz, s.created_at
  from public.students s
  where s.profile_id = (select auth.uid());

revoke all on public.student_self from public, anon;
grant select on public.student_self to authenticated, service_role;
