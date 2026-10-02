-- POST /booking in one transaction (R-SCH-06, R-SCH-04, R-LEAD-06, issue B3; docs/10 §5 #14).
-- The API (service role) computes occurrences, conflicts, meeting link and message params in TS
-- and passes them here; this function only writes, all or nothing:
--   lead path: guardian by phone (reused if it exists) + the new student;
--   schedule_rules + schedule_rule_students + lessons + lesson_students;
--   students.teacher_id where still null; lead status CAS + converted_guardian_id;
--   one queued `messages` row per guardian (dedup_key booking_confirmation:{lesson}:{guardian}).
-- p_booking = { rule: schedule_rules cols, student_ids: uuid[], lead: {id, from, to|null}|null,
--   new_guardian: guardians cols|null, new_student: students cols|null,
--   lessons: [{starts_at, ends_at, override_reason}], messages: [{guardian_id|null, phone_e164,
--   template_key, template_params}] }  (guardian_id null = the lead path's guardian).
-- Returns the BookingResult jsonb { rule_id, student_ids, guardian_ids, lessons, message_ids }.
--
-- SQL test plan (integrator, local DB, inside begin … rollback):
--   1. lead path with a new phone → 1 guardian, 1 student (teacher_id set), 1 rule, N lessons,
--      N lesson_students, 1 queued message (lesson_id = first lesson), lead status moved.
--   2. same again with the guardian's phone already present → guardian reused, no 23505.
--   3. existing student_ids (2 siblings, 1 guardian) → 2N lesson_students, 1 message.
--   4. lessons: [] → raises 22023 and nothing is written.
--   5. lead.from ≠ current status → status unchanged, booking still succeeds.
--   6. `set role authenticated; select public.create_booking(…)` → permission denied.
create function public.create_booking(p_booking jsonb, p_actor uuid)
  returns jsonb language plpgsql set search_path = '' as $$
declare
  v_lead uuid := (p_booking #>> '{lead,id}')::uuid;
  v_guardian uuid;
  v_student uuid;
  v_students uuid[];
  v_rule uuid;
  v_teacher uuid;
  v_link text;
  v_lessons jsonb;
  v_first uuid;
  v_messages jsonb;
  v_guardians jsonb;
begin
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
      starts_on, ends_on, meeting_link, package, created_from_lead_id, created_by)
    select r.teacher_id, r.duration_min, r.start_time_local, r.tz, r.byday, r.starts_on,
      r.ends_on, r.meeting_link, r.package, v_lead, p_actor
    from jsonb_populate_record(null::public.schedule_rules, p_booking -> 'rule') r
    returning id, teacher_id, meeting_link into v_rule, v_teacher, v_link;
  insert into public.schedule_rule_students (rule_id, student_id)
    select v_rule, s from unnest(v_students) s;

  with ins as (
    insert into public.lessons (rule_id, teacher_id, starts_at, ends_at, meeting_link,
        override_reason, created_by)
      select v_rule, v_teacher, o.starts_at, o.ends_at, v_link, o.override_reason, p_actor
      from jsonb_to_recordset(p_booking -> 'lessons')
        as o(starts_at timestamptz, ends_at timestamptz, override_reason text)
      on conflict (rule_id, starts_at) do nothing
      returning id, starts_at, ends_at
  )
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'starts_at', starts_at,
      'ends_at', ends_at) order by starts_at), '[]'::jsonb)
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

  with ins as (
    insert into public.messages (direction, phone_e164, lead_id, guardian_id, lesson_id,
        template_key, template_params, dedup_key, scheduled_for, created_by)
      select 'outbound', m.phone_e164, v_lead, g.id, v_first, m.template_key, m.template_params,
        'booking_confirmation:' || v_first || ':' || g.id, now(), p_actor
      from jsonb_to_recordset(coalesce(p_booking -> 'messages', '[]'))
        as m(guardian_id uuid, phone_e164 text, template_key text, template_params jsonb)
      cross join lateral (select coalesce(m.guardian_id, v_guardian) as id) g
      on conflict (dedup_key) do nothing
      returning id
  )
  select coalesce(jsonb_agg(id), '[]'::jsonb) into v_messages from ins;

  select coalesce(jsonb_agg(distinct guardian_id), '[]'::jsonb) into v_guardians
    from public.students where id = any(v_students);
  return jsonb_build_object('rule_id', v_rule, 'student_ids', to_jsonb(v_students),
    'guardian_ids', v_guardians, 'lessons', v_lessons, 'message_ids', v_messages);
end $$;

revoke execute on function public.create_booking(jsonb, uuid) from public, anon, authenticated;
grant execute on function public.create_booking(jsonb, uuid) to service_role;
