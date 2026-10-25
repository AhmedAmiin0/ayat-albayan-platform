-- Review fixes for «موعد تجريبي جديد» (PR #164 review, 2026-10-25). Expand-only, idempotent
-- (create or replace); no new table, so no new RLS. Replaces pick_trial_date (20261025000660):
--   * a move of an imported trial (no rule): the new row's students are chargeable = false, as the
--     old row's were, so it is still a trial (history, the next move, the trial status re-check).
--   * a booking (no upcoming trial) re-checks under the student lock that none of the students has
--     an open trial still ahead: two picks at once (or a trial booked meanwhile) → P0001
--     trial_changed, not two upcoming trials. A replay of its own request id is let through.
--   * a move whose request id is an existing lesson replays it only when it is a moved row of these
--     students; any other lesson → P0001 trial_date_invalid (the request id cannot read it).
--   * the students' status_change audit says via = 'trial_new_date', as the lesson / rule rows do.
--   * trial_date_replay(request, student): the first pick of a request id for that student only
--     (the moved row, or the rule's first non-moved lesson), else null.
-- SQL test plan (local DB, begin … rollback; e2e/tests/pick-trial-date.guards.sql.spec.ts):
--   1. a move of a trial with no rule → the new row's lesson_students.chargeable is false.
--   2. p.booking while an upcoming trial exists → trial_changed, nothing written.
--   3. a move whose request id is another lesson → trial_date_invalid.
--   4. trial_date_replay with another student → null.

create or replace function public.pick_trial_date(p jsonb) returns jsonb
  language plpgsql set search_path = '' as $$
declare
  v_actor uuid := (p ->> 'actor')::uuid;
  v_teacher uuid := (p ->> 'teacher_id')::uuid;
  v_lesson uuid := (p #>> '{change,lessons,0,id}')::uuid;
  v_request uuid := (p #>> '{booking,rule,client_request_id}')::uuid;
  v_students uuid[];
  v_booked jsonb;
begin
  select coalesce(array_agg(x::uuid order by x::uuid), '{}') into v_students
    from jsonb_array_elements_text(coalesce(p -> 'student_ids', '[]')) x;
  if cardinality(v_students) = 0 then
    raise exception 'pick_trial_date needs student_ids' using errcode = '22023';
  end if;

  if not (p ? 'booking') and v_lesson is not null
     and exists (select 1 from public.lessons l where l.id = v_lesson) then
    if exists (select 1 from public.lessons l join public.lesson_students ls on ls.lesson_id = l.id
                 where l.id = v_lesson and l.rescheduled_from_id is not null
                   and ls.student_id = any(v_students)) then
      return public.trial_date_result(v_lesson);
    end if;
    raise exception 'trial_date_invalid' using errcode = 'P0001';
  end if;

  -- Locked in id order: a payment activating the student meanwhile waits, then is not overwritten.
  perform 1 from public.students s where s.id = any(v_students) order by s.id for update;
  if exists (select 1 from public.students s where s.id = any(v_students)
               and s.status not in ('new', 'trial', 'pending_subscription')) then
    raise exception 'trial_date_subscribed' using errcode = 'P0001';
  end if;

  if p ? 'booking' then
    if not exists (select 1 from public.schedule_rules r where r.client_request_id = v_request)
       and public.trial_ahead(v_students) then
      raise exception 'trial_changed' using errcode = 'P0001';
    end if;
    v_booked := public.create_booking(p -> 'booking', v_actor);
    v_lesson := (v_booked #>> '{lessons,0,id}')::uuid;
  else
    perform public.apply_lesson_changes(p -> 'change');
    update public.lesson_students ls set chargeable = false
      from public.lessons l where l.id = v_lesson and ls.lesson_id = l.id and l.rule_id is null;
  end if;

  update public.students s set teacher_id = v_teacher
    where s.id = any(v_students) and v_teacher is not null
      and s.teacher_id is distinct from v_teacher;

  with moved as (
    select s.id, s.status as was from public.students s
      where s.id = any(v_students) and s.status in ('new', 'pending_subscription')
  ), upd as (
    update public.students s set status = 'trial' from moved
      where s.id = moved.id returning s.id, moved.was
  )
  insert into public.audit_log (actor_id, entity, entity_id, action, before, after)
    select v_actor, 'students', upd.id, 'status_change', jsonb_build_object('status', upd.was),
      jsonb_build_object('status', 'trial', 'via', 'trial_new_date', 'from', upd.was, 'to', 'trial',
                         'reason', 'trial_booked')
    from upd;

  return public.trial_date_result(v_lesson);
end $$;

-- An open trial still ahead for any of the students (a platform trial rule, or an imported one:
-- no rule, not chargeable, not instant, not a makeup — as isTrialLesson).
create or replace function public.trial_ahead(p_students uuid[]) returns boolean
  language sql stable set search_path = '' as $$
  select exists (
    select 1 from public.lesson_students ls
      join public.lessons l on l.id = ls.lesson_id
      left join public.schedule_rules r on r.id = l.rule_id
    where ls.student_id = any(p_students) and l.status in ('scheduled', 'confirmed')
      and l.starts_at > now()
      and (r.package = 'trial'
           or (l.rule_id is null and not ls.chargeable and not l.instant and l.makeup_of_id is null)))
$$;

-- The first pick of a request id, for this student only (POST /trial-date replays).
create or replace function public.trial_date_replay(p_request uuid, p_student uuid) returns jsonb
  language sql stable set search_path = '' as $$
  select public.trial_date_result(coalesce(
    (select l.id from public.lessons l join public.lesson_students ls on ls.lesson_id = l.id
      where l.id = p_request and l.rescheduled_from_id is not null and ls.student_id = p_student),
    (select l.id from public.schedule_rules r join public.lessons l on l.rule_id = r.id
       join public.lesson_students ls on ls.lesson_id = l.id
      where r.client_request_id = p_request and r.package = 'trial' and ls.student_id = p_student
        and l.rescheduled_from_id is null
      order by l.starts_at limit 1)))
$$;

revoke execute on function public.pick_trial_date(jsonb) from public, anon, authenticated;
grant execute on function public.pick_trial_date(jsonb) to service_role;
revoke execute on function public.trial_ahead(uuid[]) from public, anon, authenticated;
grant execute on function public.trial_ahead(uuid[]) to service_role;
revoke execute on function public.trial_date_replay(uuid, uuid) from public, anon, authenticated;
grant execute on function public.trial_date_replay(uuid, uuid) to service_role;
