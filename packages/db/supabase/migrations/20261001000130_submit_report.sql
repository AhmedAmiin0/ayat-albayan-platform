-- submit_report (docs/11 §4 R3; R-REP-02/03/04, issue A7): a report submit or edit in ONE
-- transaction. The API decides (validation, edit window, lesson started, next version, the lesson
-- outcome); this applies it:
--   1. lock the report; its version must still be `expected_version` (else version_conflict);
--      a cancelled or moved lesson has no report (lesson_cancelled);
--   2. write the form, status submitted, version / submitted_at / edited_at, pdf_status pending
--      (the PDF job claims pending rows, docs/11 §5);
--   3. snapshot the row into lesson_report_versions and audit it (R-NFR-03, invariant 6);
--   4. the lesson outcome: an open lesson moves through apply_lesson_changes (compare-and-set on
--      its status, with its own audit row); a lesson that already has an outcome only gets this
--      student's attendance and chargeable synced (the report is the source of truth for them).
-- p = { report_id, expected_version, actor, report: {<lesson_reports columns>},
--       lesson_change?: <apply_lesson_changes payload>, student?: { attendance, chargeable } }
create or replace function public.submit_report(p jsonb) returns jsonb
  language plpgsql set search_path = '' as $$
declare
  v_id uuid := (p ->> 'report_id')::uuid;
  v_actor uuid := (p ->> 'actor')::uuid;
  v_before public.lesson_reports;
  v_after public.lesson_reports;
begin
  select * into v_before from public.lesson_reports where id = v_id for update;
  if not found then
    raise exception 'report_not_found' using errcode = 'P0001';
  end if;
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

  return to_jsonb(v_after);
end $$;

revoke execute on function public.submit_report(jsonb) from public, anon, authenticated;
grant execute on function public.submit_report(jsonb) to service_role;
