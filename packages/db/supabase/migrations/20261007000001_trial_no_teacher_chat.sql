-- Trial students: no direct chat between the teacher and the family (owner, 2026-10-11):
-- «for the trial session, students and teachers cannot chat together; they will need the sales
-- to manage between them, or the system».
-- A guardian is in a teacher's chat scope only through a student of theirs who is NOT on trial;
-- a guardian with one trial child and one active child stays visible through the active child.
-- The teacher's own chat with the academy stays. teacher_student_ids is unchanged: the teacher
-- still sees trial students in lessons, schedules and reports. my_thread_phones() reads this
-- function, so the messages_teacher_read policy (migrations 164, 168) narrows with it.
create or replace function public.teacher_thread_phones(p_teacher_id uuid)
  returns table (phone_e164 text)
  language sql stable security definer set search_path = '' as $$
  select g.phone_e164::text from public.students s
    join public.guardians g on g.id = s.guardian_id
   where s.id in (select public.teacher_student_ids(p_teacher_id))
     and s.status <> 'trial'
  union
  select t.phone_e164::text from public.teachers t
   where t.id = p_teacher_id and t.phone_e164 is not null
$$;
revoke execute on function public.teacher_thread_phones(uuid) from public, anon, authenticated;
grant execute on function public.teacher_thread_phones(uuid) to service_role;
