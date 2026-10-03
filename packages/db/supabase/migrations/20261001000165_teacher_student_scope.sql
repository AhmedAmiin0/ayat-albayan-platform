-- One definition of «my student» for a teacher (verifier, scope consistency): assigned to them
-- (students.teacher_id, any status) or in a lesson of theirs from the last 90 days on (future
-- lessons included). Threads (teacher_thread_phones), report history and the balance guard all
-- read it, so a substitute lesson long ago no longer keeps a teacher's access forever.
create function public.teacher_student_ids(p_teacher_id uuid)
  returns setof uuid
  language sql stable security definer set search_path = '' as $$
  select s.id from public.students s where s.teacher_id = p_teacher_id
  union
  select ls.student_id from public.lessons l
    join public.lesson_students ls on ls.lesson_id = l.id
   where l.teacher_id = p_teacher_id and l.starts_at >= now() - interval '90 days'
$$;
revoke execute on function public.teacher_student_ids(uuid) from public, anon, authenticated;
grant execute on function public.teacher_student_ids(uuid) to service_role;

create function public.teacher_has_student(p_teacher_id uuid, p_student_id uuid)
  returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.teacher_student_ids(p_teacher_id) id where id = p_student_id)
$$;
revoke execute on function public.teacher_has_student(uuid, uuid) from public, anon, authenticated;
grant execute on function public.teacher_has_student(uuid, uuid) to service_role;

-- Same rows as migration 164, now built on the shared definition.
create or replace function public.teacher_thread_phones(p_teacher_id uuid)
  returns table (phone_e164 text)
  language sql stable security definer set search_path = '' as $$
  select g.phone_e164::text from public.students s
    join public.guardians g on g.id = s.guardian_id
   where s.id in (select public.teacher_student_ids(p_teacher_id))
  union
  select t.phone_e164::text from public.teachers t
   where t.id = p_teacher_id and t.phone_e164 is not null
$$;

-- A draft payout is a number the admin may still change: a teacher reads approved / paid rows only
-- (R-PAY-02), through the API and through RLS alike.
drop policy teacher_payouts_teacher_read on public.teacher_payouts;
create policy teacher_payouts_teacher_read on public.teacher_payouts for select to authenticated
  using (teacher_id = (select public.my_teacher_id()) and status <> 'draft');
