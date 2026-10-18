-- change_course (owner 2026-10-18, «تغيير أيام الحلقات»): new days and times for the lessons of an
-- assistant course (schedule_rules.subscription_id, migration 470) that have not happened yet, by the
-- assistant (her own student, never over a clash) or the admin (override with a reason). ONE
-- transaction made of the existing whole-rule reschedule steps, each run through apply_lesson_changes
-- v3 (migration 475), which is NOT changed (every existing payload behaves exactly as before):
--   1. each end_rules[i]: { id, ends_on, changes } → end_rule (the day before the change point) and its
--      open lessons from the change point → rescheduled, chargeable false (as RescheduleRuleService);
--   2. each new_rules[i]: { …rule, student_ids, lessons } → new_rule (subscription_id = the course's;
--      the first one has first_rule_id null, the others the first's id) and its lessons;
--   3. messages + audit (entity subscriptions, entity_id = the course, actor = p.actor).
-- The first new rule stores client_request_id: a retry returns the first change (rule 8). A
-- transaction-scoped advisory lock per course serialises two changes of the same course.
-- Raises (P0001): course_mismatch (a rule of another course), rule_not_active / invalid_transition
-- (from apply_lesson_changes: the course changed meanwhile). Anything raised rolls everything back.
-- Returns { rule_ids (the first new rule first), ends_on }.
-- SQL test plan (local DB, begin … rollback; e2e/tests/change-course.sql.spec.ts):
--   1. two old rules + two new rules → old rules end the day before, their future lessons are
--      rescheduled, the new rules carry subscription_id / first_rule_id, one audit row.
--   2. the same client_request_id again → the same rule_ids, nothing new written.
--   3. a new rule of another subscription → course_mismatch and nothing written (all-or-nothing).
--   4. apply_lesson_changes with a v3 payload (no new fields) still stores subscription_id null.

create or replace function public.course_change_result(p_first uuid)
  returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'rule_ids', coalesce(jsonb_agg(r.id order by r.id <> p_first, r.start_time_local, r.id), '[]'::jsonb),
    'ends_on', max(r.ends_on))
  from public.schedule_rules r
  where r.id = p_first or r.first_rule_id = p_first;
$$;

create or replace function public.change_course(p jsonb) returns jsonb
  language plpgsql set search_path = '' as $$
declare
  v_request uuid := (p ->> 'client_request_id')::uuid;
  v_sub uuid := (p ->> 'subscription_id')::uuid;
  v_actor jsonb := p -> 'actor';
  v_first uuid;
  v_end jsonb;
  v_rule jsonb;
begin
  if v_request is null or v_sub is null then
    raise exception 'change_course needs client_request_id and subscription_id' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('change_course:' || v_sub::text, 0));
  select id into v_first from public.schedule_rules where client_request_id = v_request;
  if v_first is not null then
    return public.course_change_result(v_first);
  end if;
  if jsonb_array_length(coalesce(p -> 'new_rules', '[]'::jsonb)) = 0
     or jsonb_typeof(p -> 'audit') is distinct from 'object' then
    raise exception 'change_course needs new_rules and audit' using errcode = '22023';
  end if;

  for v_end in select * from jsonb_array_elements(coalesce(p -> 'end_rules', '[]'::jsonb)) loop
    if not exists (select 1 from public.schedule_rules
                    where id = (v_end ->> 'id')::uuid and subscription_id = v_sub) then
      raise exception 'course_mismatch' using errcode = 'P0001';
    end if;
    perform public.apply_lesson_changes(jsonb_build_object(
      'actor', v_actor,
      'end_rule', jsonb_build_object('id', v_end -> 'id', 'ends_on', v_end -> 'ends_on'),
      'changes', coalesce(v_end -> 'changes', '[]'::jsonb)));
  end loop;

  for v_rule in select * from jsonb_array_elements(p -> 'new_rules') loop
    if (v_rule ->> 'subscription_id')::uuid is distinct from v_sub then
      raise exception 'course_mismatch' using errcode = 'P0001';
    end if;
    perform public.apply_lesson_changes(jsonb_build_object(
      'actor', v_actor,
      'new_rule', v_rule - 'lessons',
      'lessons', coalesce(v_rule -> 'lessons', '[]'::jsonb)));
    if v_first is null then
      v_first := (v_rule ->> 'id')::uuid;
      update public.schedule_rules set client_request_id = v_request where id = v_first;
    end if;
  end loop;

  perform public.apply_lesson_changes(jsonb_build_object(
    'actor', v_actor,
    'messages', coalesce(p -> 'messages', '[]'::jsonb),
    'audit', p -> 'audit'));
  return public.course_change_result(v_first);
end $$;

revoke execute on function public.course_change_result(uuid) from public, anon, authenticated;
grant execute on function public.course_change_result(uuid) to service_role;
revoke execute on function public.change_course(jsonb) from public, anon, authenticated;
grant execute on function public.change_course(jsonb) to service_role;
