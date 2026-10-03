-- «البرنامج *» on the lesson report (docs/13-forms-spec.md, form 2): the report keeps the program
-- the lesson was taught in (القرآن الكريم / اللغة العربية / الدراسات الإسلامية), prefilled from the
-- student program and editable by the teacher. Nullable only for rows that predate this column;
-- they are backfilled here, and every new draft is created with it (ReportsQueries.ensureDrafts).
alter table public.lesson_reports add column program public.program;
update public.lesson_reports r set program = s.program
  from public.students s where s.id = r.student_id;

-- submit_report v3 = v2 plus program (a submit that omits it keeps the stored one).
create or replace function public.submit_report(p jsonb) returns jsonb
  language plpgsql set search_path = '' as $$
declare
  v_id uuid := (p ->> 'report_id')::uuid;
  v_actor uuid := (p ->> 'actor')::uuid;
  v_before public.lesson_reports;
  v_after public.lesson_reports;
  v_status public.lesson_status;
  v_derived public.lesson_status;
begin
  select * into v_before from public.lesson_reports where id = v_id for update;
  if not found then
    raise exception 'report_not_found' using errcode = 'P0001';
  end if;
  perform 1 from public.lessons l where l.id = v_before.lesson_id for update;
  if v_before.version <> (p ->> 'expected_version')::int then
    raise exception 'version_conflict' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.lessons l
             where l.id = v_before.lesson_id
               and l.status in ('cancelled_by_teacher', 'cancelled_by_admin', 'rescheduled')) then
    raise exception 'lesson_cancelled' using errcode = 'P0001';
  end if;

  update public.lesson_reports t
     set attendance = x.attendance, recited = x.recited, new_memorization = x.new_memorization,
         revision = x.revision, theory = x.theory,
         grade_recitation = x.grade_recitation, grade_memorization = x.grade_memorization,
         grade_revision = x.grade_revision, grade_tajweed = x.grade_tajweed,
         grade_engagement = x.grade_engagement, grade_commitment = x.grade_commitment,
         grade_overall = x.grade_overall, notes = x.notes, homework = x.homework,
         next_plan = x.next_plan,
         program = coalesce(x.program, t.program),
         status = 'submitted', version = x.version, submitted_at = x.submitted_at,
         edited_at = x.edited_at, pdf_status = 'pending', pdf_error = null
    from jsonb_populate_record(null::public.lesson_reports, p -> 'report') x
   where t.id = v_id
  returning t.* into v_after;

  insert into public.lesson_report_versions (report_id, version, snapshot, created_by)
  values (v_id, v_after.version, to_jsonb(v_after), v_actor);
  insert into public.audit_log (actor_id, entity, entity_id, action, before, after)
  values (v_actor, 'lesson_reports', v_id,
          case when v_before.version = 0 then 'submit' else 'edit' end,
          to_jsonb(v_before), to_jsonb(v_after));

  if p ? 'lesson_change' then
    perform public.apply_lesson_changes(p -> 'lesson_change');
  elsif p ? 'student' then
    update public.lesson_students ls
       set attendance = (p -> 'student' ->> 'attendance')::public.attendance,
           chargeable = (p -> 'student' ->> 'chargeable')::boolean
     where ls.lesson_id = v_before.lesson_id and ls.student_id = v_before.student_id;
  end if;

  -- The outcome follows the students' attendance (see the header).
  select l.status into v_status from public.lessons l where l.id = v_before.lesson_id;
  select case
           when bool_or(ls.attendance = 'on_time') then 'completed'
           when bool_or(ls.attendance = 'late') then 'late'
           when bool_or(ls.attendance = 'absent') then 'no_show'
           when bool_or(ls.attendance = 'excused') then 'excused'
         end::public.lesson_status
    into v_derived
    from public.lesson_students ls
   where ls.lesson_id = v_before.lesson_id;
  if v_derived is not null and v_derived <> v_status
     and v_status in ('completed', 'late', 'no_show', 'excused') then
    update public.lessons l set status = v_derived where l.id = v_before.lesson_id;
    insert into public.audit_log (actor_id, entity, entity_id, action, before, after)
    values (v_actor, 'lessons', v_before.lesson_id, 'status_change',
            jsonb_build_object('status', v_status),
            jsonb_build_object('status', v_derived, 'via', 'report', 'report_id', v_id));
  end if;

  return to_jsonb(v_after);
end $$;

revoke execute on function public.submit_report(jsonb) from public, anon, authenticated;
grant execute on function public.submit_report(jsonb) to service_role;
