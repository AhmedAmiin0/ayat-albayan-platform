-- create_booking v2 (Phase 2 verifier fixes). Changes from migration 090:
--   * p_booking.rule.client_request_id: a replayed request returns the first booking's result
--     instead of a second rule (double click, or a retry after a lost response).
--   * every lesson row carries its own meeting_link: schedule_rules.meeting_link now holds only
--     the admin's explicit link, so a later change of the teacher's link reaches new lessons
--     (R-LES-01, issue B8).
--   * p_booking.audit {after} is written to audit_log in the same transaction (R-NFR-03).
-- SQL test plan (local DB, begin … rollback): the 090 plan, plus
--   7. the same payload twice with one client_request_id → 1 rule, 1 message, equal results.
--   8. audit_log has 1 'book' row for the rule, with student_ids and the lesson count.

-- BookingResult of an existing rule: its students, their guardians, its generated lessons and the
-- confirmations queued for the first one.
create function public.booking_result(p_rule uuid) returns jsonb
  language sql stable set search_path = '' as $$
  with lessons as (
    select id, starts_at, ends_at from public.lessons
    where rule_id = p_rule and rescheduled_from_id is null
  ), first_lesson as (
    select id from lessons order by starts_at limit 1
  )
  select jsonb_build_object(
    'rule_id', p_rule,
    'student_ids', (select coalesce(jsonb_agg(rs.student_id order by rs.student_id), '[]'::jsonb)
                      from public.schedule_rule_students rs where rs.rule_id = p_rule),
    'guardian_ids', (select coalesce(jsonb_agg(distinct s.guardian_id), '[]'::jsonb)
                       from public.schedule_rule_students rs
                       join public.students s on s.id = rs.student_id where rs.rule_id = p_rule),
    'lessons', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'starts_at', starts_at,
                  'ends_at', ends_at) order by starts_at), '[]'::jsonb) from lessons),
    'message_ids', (select coalesce(jsonb_agg(m.id order by m.created_at), '[]'::jsonb)
                      from public.messages m
                      where m.lesson_id = (select id from first_lesson)
                        and m.dedup_key like 'booking_confirmation:%'))
$$;
revoke execute on function public.booking_result(uuid) from public, anon, authenticated;
grant execute on function public.booking_result(uuid) to service_role;

create or replace function public.create_booking(p_booking jsonb, p_actor uuid)
  returns jsonb language plpgsql set search_path = '' as $$
declare
  v_lead uuid := (p_booking #>> '{lead,id}')::uuid;
  v_request uuid := (p_booking #>> '{rule,client_request_id}')::uuid;
  v_guardian uuid;
  v_student uuid;
  v_students uuid[];
  v_rule uuid;
  v_teacher uuid;
  v_lessons jsonb;
  v_first uuid;
begin
  if v_request is not null then
    select id into v_rule from public.schedule_rules where client_request_id = v_request;
    if v_rule is not null then
      return public.booking_result(v_rule);
    end if;
  end if;

  select coalesce(array_agg(x::uuid), '{}') into v_students
    from jsonb_array_elements_text(coalesce(p_booking -> 'student_ids', '[]')) x;

  if jsonb_typeof(p_booking -> 'new_student') = 'object' then
    insert into public.guardians (name, phone_e164, country, tz, source, notes, created_by)
      select g.name, g.phone_e164, g.country, g.tz, g.source, g.notes, p_actor
      from jsonb_populate_record(null::public.guardians, p_booking -> 'new_guardian') g
      on conflict (phone_e164) do nothing
      returning id into v_guardian;
    if v_guardian is null then
      select id into v_guardian from public.guardians
        where phone_e164 = (p_booking #>> '{new_guardian,phone_e164}');
    end if;
    insert into public.students (guardian_id, name, name_normalized, age, gender, program, level,
        memorized, goal, riwaya, tz, status, teacher_id, teacher_gender_pref,
        meeting_link_override, notes, created_by)
      select v_guardian, s.name, s.name_normalized, s.age, s.gender, coalesce(s.program, 'quran'),
        s.level, s.memorized, s.goal, s.riwaya, s.tz, coalesce(s.status, 'trial'),
        (p_booking #>> '{rule,teacher_id}')::uuid, s.teacher_gender_pref,
        s.meeting_link_override, s.notes, p_actor
      from jsonb_populate_record(null::public.students, p_booking -> 'new_student') s
      returning id into v_student;
    v_students := v_students || v_student;
  end if;

  insert into public.schedule_rules (teacher_id, duration_min, start_time_local, tz, byday,
      starts_on, ends_on, meeting_link, package, created_from_lead_id, client_request_id, created_by)
    select r.teacher_id, r.duration_min, r.start_time_local, r.tz, r.byday, r.starts_on,
      r.ends_on, r.meeting_link, r.package, v_lead, v_request, p_actor
    from jsonb_populate_record(null::public.schedule_rules, p_booking -> 'rule') r
    returning id, teacher_id into v_rule, v_teacher;
  insert into public.schedule_rule_students (rule_id, student_id)
    select v_rule, s from unnest(v_students) s;

  with ins as (
    insert into public.lessons (rule_id, teacher_id, starts_at, ends_at, meeting_link,
        override_reason, created_by)
      select v_rule, v_teacher, o.starts_at, o.ends_at, o.meeting_link, o.override_reason, p_actor
      from jsonb_to_recordset(p_booking -> 'lessons')
        as o(starts_at timestamptz, ends_at timestamptz, meeting_link text, override_reason text)
      on conflict do nothing
      returning id, starts_at
  )
  select coalesce(jsonb_agg(jsonb_build_object('id', id) order by starts_at), '[]'::jsonb)
    into v_lessons from ins;
  if jsonb_array_length(v_lessons) = 0 then
    raise exception 'booking has no lessons' using errcode = '22023';
  end if;
  v_first := (v_lessons #>> '{0,id}')::uuid;
  insert into public.lesson_students (lesson_id, student_id)
    select (l ->> 'id')::uuid, s from jsonb_array_elements(v_lessons) l cross join unnest(v_students) s;

  update public.students set teacher_id = v_teacher
    where id = any(v_students) and teacher_id is null;

  if v_lead is not null then
    update public.leads set status = (p_booking #>> '{lead,to}')::public.lead_status
      where id = v_lead and p_booking #>> '{lead,to}' is not null
        and status::text = p_booking #>> '{lead,from}';
    update public.leads set converted_guardian_id = coalesce(v_guardian,
        (select guardian_id from public.students where id = v_students[1]))
      where id = v_lead and converted_guardian_id is null;
  end if;

  insert into public.messages (direction, phone_e164, lead_id, guardian_id, lesson_id,
      template_key, template_params, dedup_key, scheduled_for, created_by)
    select 'outbound', m.phone_e164, v_lead, g.id, v_first, m.template_key, m.template_params,
      'booking_confirmation:' || v_first || ':' || g.id, now(), p_actor
    from jsonb_to_recordset(coalesce(p_booking -> 'messages', '[]'))
      as m(guardian_id uuid, phone_e164 text, template_key text, template_params jsonb)
    cross join lateral (select coalesce(m.guardian_id, v_guardian) as id) g
    on conflict (dedup_key) do nothing;

  insert into public.audit_log (actor_id, entity, entity_id, action, after)
    values (p_actor, 'schedule_rules', v_rule, 'book',
      coalesce(p_booking #> '{audit,after}', '{}'::jsonb)
        || jsonb_build_object('student_ids', to_jsonb(v_students),
                              'lessons', jsonb_array_length(v_lessons)));

  return public.booking_result(v_rule);
end $$;
