-- «المعلم/ة» in the assistant's subscribe step (docs/31 §2, docs/16 row 16; owner 2026-10-29: «Assistant
-- assigns the student to the teacher when the student take the trial and decided to subscribe so he can
-- start chatting with the teacher»).
--
-- assign_student_teacher(student, teacher, actor): students.teacher_id = an ACTIVE teacher, with one
-- audit_log row (entity students, action teacher_assign, before/after teacher_id) in the same statement.
-- No change (the same teacher) writes nothing (a replayed subscribe is idempotent, rule 8). A teacher
-- change moves the channel at once (channel_teacher_ids reads students.teacher_id).
-- Service role only: the API checks the assistant owns the student (self.sales_money) first.
-- Idempotent.

create or replace function public.assign_student_teacher(p_student uuid, p_teacher uuid, p_actor uuid)
  returns boolean
  language plpgsql security definer set search_path = '' as $$
declare
  v_before uuid;
begin
  if not exists (select 1 from public.teachers t where t.id = p_teacher and t.status = 'active') then
    raise exception 'teacher_not_found' using errcode = 'P0001';
  end if;
  select s.teacher_id into v_before from public.students s where s.id = p_student for update;
  if not found then
    raise exception 'student_not_found' using errcode = 'P0001';
  end if;
  if v_before is not distinct from p_teacher then
    return false;
  end if;
  update public.students set teacher_id = p_teacher where id = p_student;
  insert into public.audit_log (actor_id, entity, entity_id, action, before, after)
  values (p_actor, 'students', p_student, 'teacher_assign',
          jsonb_build_object('teacher_id', v_before), jsonb_build_object('teacher_id', p_teacher, 'via', 'sales_subscribe'));
  return true;
end $$;
revoke execute on function public.assign_student_teacher(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.assign_student_teacher(uuid, uuid, uuid) to service_role;

-- MANUAL ROLLBACK (only after the code rollback): drop function public.assign_student_teacher(uuid, uuid, uuid).
