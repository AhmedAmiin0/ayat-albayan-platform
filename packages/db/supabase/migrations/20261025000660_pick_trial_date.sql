-- «موعد تجريبي جديد» (owner 2026-10-25): a new free-trial date for an existing student with no
-- running subscription, written in ONE transaction. Expand-only, idempotent (create or replace,
-- if not exists); no new table, so no new RLS (lessons / students keep theirs).
--   * pick_trial_date(p): p.booking = a create_booking payload (no upcoming trial: a new trial rule
--     and lesson), or p.change = an apply_lesson_changes payload (the upcoming trial becomes
--     `rescheduled`, a new row on the same rule carries rescheduled_from_id = the old id, so it never
--     takes its rule's slot and the old row keeps it). Then, in the same transaction, every student
--     of p.student_ids (rows locked by id) must still be new / trial / pending_subscription
--     (P0001 trial_date_subscribed otherwise), new / pending_subscription → trial (audited
--     status_change, reason trial_booked) and a not-subscribed student's teacher_id follows the trial.
--     A move whose new lesson id already exists (the request id) is a replay: nothing is written.
--   * lessons_rescheduled_from_idx: the history reads which date replaced which (FK index).
-- SQL test plan (local DB, begin … rollback; e2e/tests/pick-trial-date.sql.spec.ts):
--   1. p.change → old lesson rescheduled, new lesson has rescheduled_from_id, student → trial.
--   2. the same p.change again → nothing new (one new lesson, one audit row).
--   3. an active student → trial_date_subscribed, nothing written.
--   4. p.booking for a pending_subscription student → new rule + lesson, student → trial.

create index if not exists lessons_rescheduled_from_idx on public.lessons (rescheduled_from_id)
  where rescheduled_from_id is not null;

create or replace function public.pick_trial_date(p jsonb) returns jsonb
  language plpgsql set search_path = '' as $$
declare
  v_actor uuid := (p ->> 'actor')::uuid;
  v_teacher uuid := (p ->> 'teacher_id')::uuid;
  v_lesson uuid := (p #>> '{change,lessons,0,id}')::uuid;
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
    return public.trial_date_result(v_lesson);
  end if;

  -- Locked in id order: a payment activating the student meanwhile waits, then is not overwritten.
  perform 1 from public.students s where s.id = any(v_students) order by s.id for update;
  if exists (select 1 from public.students s where s.id = any(v_students)
               and s.status not in ('new', 'trial', 'pending_subscription')) then
    raise exception 'trial_date_subscribed' using errcode = 'P0001';
  end if;

  if p ? 'booking' then
    v_booked := public.create_booking(p -> 'booking', v_actor);
    v_lesson := (v_booked #>> '{lessons,0,id}')::uuid;
  else
    perform public.apply_lesson_changes(p -> 'change');
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
      jsonb_build_object('status', 'trial', 'via', 'trial_date', 'from', upd.was, 'to', 'trial',
                         'reason', 'trial_booked')
    from upd;

  return public.trial_date_result(v_lesson);
end $$;

-- The picked lesson as POST /trial-date answers it (TrialDateResult).
create or replace function public.trial_date_result(p_lesson uuid) returns jsonb
  language sql stable set search_path = '' as $$
  select jsonb_build_object('lesson_id', l.id, 'starts_at', l.starts_at, 'ends_at', l.ends_at,
                            'teacher_id', l.teacher_id, 'moved_from_id', l.rescheduled_from_id)
  from public.lessons l where l.id = p_lesson
$$;

revoke execute on function public.pick_trial_date(jsonb) from public, anon, authenticated;
grant execute on function public.pick_trial_date(jsonb) to service_role;
revoke execute on function public.trial_date_result(uuid) from public, anon, authenticated;
grant execute on function public.trial_date_result(uuid) to service_role;
