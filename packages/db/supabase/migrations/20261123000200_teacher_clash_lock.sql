-- Teacher clash lock (audit BE-03; R-SCH-04, R-SCH-07, R-SCH-11). Booking and lesson moves check
-- the teacher's time with a read in the API, then write here: two writes for one teacher slot could
-- both pass that read. create_booking (latest: 20261106000501), edit_lesson_time (latest:
-- 20261117100160) and apply_lesson_changes (latest: 20261018000475) now take a transaction advisory
-- lock per teacher they write or move, in uuid order and before any lesson row lock, then
-- re-read that teacher's occupying lessons (OCCUPYING_LESSON_STATUSES) overlapping each new
-- interval and raise teacher_clash (P0001; the API answers 409) unless the lesson carries
-- override_reason. No exclusion constraint: an audited override may double-book on purpose.
-- create_booking replays its client_request_id once more after the lock: a retry that waited on
-- the winner returns the winner's booking, not teacher_clash. Every other line is unchanged.
-- The overlap read uses lessons_teacher_time_idx (teacher_id, starts_at).
-- RLS / grants: the functions are security invoker; service role only, as before.
-- SQL test plan (e2e/tests/teaching/teacher-clash-lock.sql.spec.ts):
--   1. two concurrent create_booking calls for one teacher slot → one booked, one teacher_clash.
--   2. a booking over that slot with override_reason → booked.
--   3. edit_lesson_time / apply_lesson_changes onto a booked slot → teacher_clash.
-- MANUAL ROLLBACK: re-run the three functions from the migrations above, then drop
-- public.raise_teacher_clash(jsonb) and public.lock_teachers(uuid[]).

set local lock_timeout = '5s';

create or replace function public.lock_teachers(p_teachers uuid[]) returns void
  language plpgsql set search_path = '' as $$
declare
  v_teacher uuid;
begin
  for v_teacher in
    select distinct t from unnest(p_teachers) t where t is not null order by t
  loop
    perform pg_advisory_xact_lock(hashtextextended('teacher:' || v_teacher::text, 0));
  end loop;
end $$;

revoke execute on function public.lock_teachers(uuid[]) from public, anon, authenticated;
grant execute on function public.lock_teachers(uuid[]) to service_role;

-- Statuses: OCCUPYING_LESSON_STATUSES in packages/schedule (lessons/state-machine).
create or replace function public.raise_teacher_clash(p_slots jsonb) returns void
  language plpgsql set search_path = '' as $$
begin
  if exists (
    select 1
    from jsonb_to_recordset(p_slots) as n(id uuid, teacher_id uuid, starts_at timestamptz,
                                          ends_at timestamptz, override_reason text)
    join public.lessons l on l.teacher_id = n.teacher_id
      and l.status in ('scheduled', 'confirmed', 'completed', 'late', 'no_show')
      and l.starts_at < n.ends_at and l.ends_at > n.starts_at
      and l.id is distinct from n.id
    where nullif(n.override_reason, '') is null
  ) then
    raise exception 'teacher_clash' using errcode = 'P0001';
  end if;
end $$;

revoke execute on function public.raise_teacher_clash(jsonb) from public, anon, authenticated;
grant execute on function public.raise_teacher_clash(jsonb) to service_role;

create or replace function public.create_booking(p_booking jsonb, p_actor uuid)
  returns jsonb language plpgsql set search_path = '' as $$
declare
  v_lead uuid := (p_booking #>> '{lead,id}')::uuid;
  v_request uuid := (p_booking #>> '{rule,client_request_id}')::uuid;
  v_makeup uuid := (p_booking ->> 'makeup_of')::uuid;
  v_sub uuid := (p_booking #>> '{rule,subscription_id}')::uuid;
  v_guardian uuid;
  v_student uuid;
  v_students uuid[];
  v_rule uuid;
  v_teacher uuid;
  v_lessons jsonb;
  v_first uuid;
  v_sibling jsonb;
  v_sibling_rule uuid;
  v_sibling_lessons jsonb;
  v_rule_ids uuid[];
  v_count int;
begin
  if v_request is not null then
    select id into v_rule from public.schedule_rules where client_request_id = v_request;
    if v_rule is not null then
      return public.booking_result(v_rule);
    end if;
  end if;

  -- One course per package: serialise its bookings, then replay or refuse (migration 20261106000501).
  if v_sub is not null then
    perform pg_advisory_xact_lock(hashtextextended('course:' || v_sub::text, 0));
    select id into v_rule from public.schedule_rules where client_request_id = v_request;
    if v_rule is not null then
      return public.booking_result(v_rule);
    end if;
    if exists (select 1 from public.schedule_rules where subscription_id = v_sub) then
      raise exception 'course_exists' using errcode = 'P0001';
    end if;
  end if;

  select coalesce(array_agg(x::uuid), '{}') into v_students
    from jsonb_array_elements_text(coalesce(p_booking -> 'student_ids', '[]')) x;

  if v_makeup is not null and not exists (
    select 1 from public.lessons l
      join public.lesson_students ls on ls.lesson_id = l.id
      where l.id = v_makeup and ls.student_id = v_students[1] and ls.chargeable
        and l.status in ('no_show', 'excused')
  ) then
    raise exception 'makeup_not_eligible' using errcode = 'P0001';
  end if;
  -- One active makeup per missed lesson AND student: A and B of a group lesson each get theirs.
  if v_makeup is not null and exists (
    select 1 from public.lessons l where l.makeup_of_id = v_makeup
      and l.makeup_student_id = v_students[1]
      and l.status not in ('cancelled_by_teacher', 'cancelled_by_admin', 'rescheduled')
  ) then
    raise exception 'duplicate key value violates unique index "lessons_makeup_of_key"'
      using errcode = '23505';
  end if;
  if jsonb_typeof(p_booking -> 'invoice') = 'object' and v_request is null then
    raise exception 'invoice needs rule.client_request_id' using errcode = '22023';
  end if;

  -- One teacher slot at a time (migration 20261123000200): the API's clash read is not a lock.
  perform public.lock_teachers(array[(p_booking #>> '{rule,teacher_id}')::uuid]);
  if v_request is not null then
    select id into v_rule from public.schedule_rules where client_request_id = v_request;
    if v_rule is not null then
      return public.booking_result(v_rule);
    end if;
  end if;
  perform public.raise_teacher_clash((
    select coalesce(jsonb_agg(o || jsonb_build_object('teacher_id', p_booking #> '{rule,teacher_id}')),
                    '[]'::jsonb)
    from jsonb_array_elements(coalesce(p_booking -> 'lessons', '[]'::jsonb)
      || coalesce((select jsonb_agg(sl) from jsonb_array_elements(coalesce(p_booking -> 'siblings', '[]')) sb
                     cross join jsonb_array_elements(coalesce(sb -> 'lessons', '[]')) sl), '[]'::jsonb)) o));

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
        meeting_link_override, notes, contact_is_self, created_by)
      select v_guardian, s.name, s.name_normalized, s.age, s.gender, coalesce(s.program, 'quran'),
        s.level, s.memorized, s.goal, s.riwaya, s.tz, coalesce(s.status, 'trial'),
        (p_booking #>> '{rule,teacher_id}')::uuid, s.teacher_gender_pref,
        s.meeting_link_override, s.notes, coalesce(s.contact_is_self, false), p_actor
      from jsonb_populate_record(null::public.students, p_booking -> 'new_student') s
      returning id into v_student;
    v_students := v_students || v_student;
  end if;

  insert into public.schedule_rules (teacher_id, duration_min, start_time_local, tz, byday,
      starts_on, ends_on, meeting_link, package, created_from_lead_id, client_request_id,
      subscription_id, created_by)
    select r.teacher_id, r.duration_min, r.start_time_local, r.tz, r.byday, r.starts_on,
      r.ends_on, r.meeting_link, r.package, v_lead, v_request, r.subscription_id, p_actor
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
  -- Tagged after the insert: `on conflict do nothing` above would swallow lessons_makeup_of_key.
  if v_makeup is not null then
    update public.lessons set makeup_of_id = v_makeup, makeup_student_id = v_students[1]
      where id = v_first;
  end if;
  insert into public.lesson_students (lesson_id, student_id)
    select (l ->> 'id')::uuid, s from jsonb_array_elements(v_lessons) l cross join unnest(v_students) s;
  v_rule_ids := array[v_rule];
  v_count := jsonb_array_length(v_lessons);

  -- The other times of the same booking: one rule per distinct time, tied to the first rule.
  for v_sibling in select * from jsonb_array_elements(coalesce(p_booking -> 'siblings', '[]')) loop
    insert into public.schedule_rules (teacher_id, duration_min, start_time_local, tz, byday,
        starts_on, ends_on, meeting_link, package, created_from_lead_id, first_rule_id,
        subscription_id, created_by)
      select v_teacher, r.duration_min, r.start_time_local, r.tz, r.byday, r.starts_on,
        r.ends_on, r.meeting_link, r.package, v_lead, v_rule, r.subscription_id, p_actor
      from jsonb_populate_record(null::public.schedule_rules, v_sibling -> 'rule') r
      returning id into v_sibling_rule;
    insert into public.schedule_rule_students (rule_id, student_id)
      select v_sibling_rule, s from unnest(v_students) s;
    with ins as (
      insert into public.lessons (rule_id, teacher_id, starts_at, ends_at, meeting_link,
          override_reason, created_by)
        select v_sibling_rule, v_teacher, o.starts_at, o.ends_at, o.meeting_link,
          o.override_reason, p_actor
        from jsonb_to_recordset(coalesce(v_sibling -> 'lessons', '[]'))
          as o(starts_at timestamptz, ends_at timestamptz, meeting_link text, override_reason text)
        on conflict do nothing
        returning id
    )
    select coalesce(jsonb_agg(jsonb_build_object('id', id)), '[]'::jsonb) into v_sibling_lessons
      from ins;
    insert into public.lesson_students (lesson_id, student_id)
      select (l ->> 'id')::uuid, s
      from jsonb_array_elements(v_sibling_lessons) l cross join unnest(v_students) s;
    v_rule_ids := v_rule_ids || v_sibling_rule;
    v_count := v_count + jsonb_array_length(v_sibling_lessons);
  end loop;

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

  if jsonb_typeof(p_booking -> 'invoice') = 'object' then
    insert into public.invoices (rule_id, kind, storage_path, mime, size_bytes, source,
        message_id, client_request_id, created_by)
      select v_rule, i.kind, i.path, i.mime, i.size_bytes, i.source, i.message_id, v_request,
        p_actor
      from jsonb_to_record(p_booking -> 'invoice') as i(
        kind public.booking_kind, path text, mime text, size_bytes int, source text,
        message_id uuid);
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
                              'lessons', v_count, 'rule_ids', to_jsonb(v_rule_ids)));

  return public.booking_result(v_rule);
end $$;

revoke execute on function public.create_booking(jsonb, uuid) from public, anon, authenticated;
grant execute on function public.create_booking(jsonb, uuid) to service_role;

create or replace function public.edit_lesson_time(p jsonb) returns void
  language plpgsql set search_path = '' as $$
declare
  v_actor uuid := (p ->> 'actor')::uuid;
  v_id uuid := (p ->> 'lesson_id')::uuid;
  v_status public.lesson_status := (p #>> '{from,status}')::public.lesson_status;
  v_from_start timestamptz := (p #>> '{from,starts_at}')::timestamptz;
  v_from_end timestamptz := (p #>> '{from,ends_at}')::timestamptz;
  v_to_start timestamptz := (p #>> '{to,starts_at}')::timestamptz;
  v_to_end timestamptz := (p #>> '{to,ends_at}')::timestamptz;
  v_moved boolean := v_to_start <> v_from_start;
begin
  perform public.lock_teachers(array(select l.teacher_id from public.lessons l where l.id = v_id));
  perform public.raise_teacher_clash(jsonb_build_array(jsonb_build_object(
    'id', v_id, 'teacher_id', (select l.teacher_id from public.lessons l where l.id = v_id),
    'starts_at', v_to_start, 'ends_at', v_to_end, 'override_reason', p ->> 'override_reason')));

  -- Compare-and-set: two admins (or a status change meanwhile) never overwrite each other.
  -- The guardian confirmed the OLD time, so a confirmed lesson that moves goes back to scheduled
  -- (a direct update: the state machine gets no new edge).
  update public.lessons l
     set starts_at = v_to_start,
         ends_at = v_to_end,
         time_edited_at = now(),
         time_edit_reason = nullif(p ->> 'reason', ''),
         time_edit_was = jsonb_build_object('starts_at', v_from_start, 'ends_at', v_from_end),
         conflicts = null,
         override_reason = coalesce(nullif(p ->> 'override_reason', ''), l.override_reason),
         status = case when v_moved and l.status = 'confirmed'
                       then 'scheduled'::public.lesson_status else l.status end,
         confirmed_at = case when v_moved and l.status = 'confirmed' then null else l.confirmed_at end,
         confirmed_by = case when v_moved and l.status = 'confirmed' then null else l.confirmed_by end,
         teacher_confirmed_at = case when v_moved then null else l.teacher_confirmed_at end,
         teacher_confirmed_by = case when v_moved then null else l.teacher_confirmed_by end,
         -- «افتح الحلقة الآن» opened the OLD time's room: a moved lesson opens at its new window.
         room_opened_at = case when v_moved then null else l.room_opened_at end,
         -- «إنهاء الحلقة للجميع» ended the old time's session: a moved lesson is a new one.
         room_ended_at = case when v_moved then null else l.room_ended_at end
   where l.id = v_id and l.status = v_status and l.starts_at = v_from_start
     and l.ends_at = v_from_end;
  if not found then
    raise exception 'stale_time' using errcode = 'P0001';
  end if;

  -- An open lesson with a new start: nothing queued with the old time may still go out, and the
  -- reminder / needs-confirmation keys are freed so the jobs notify again for the new time.
  -- (A uuid suffix, not the time: A→B→A→B must not collide with an earlier freed key.)
  if coalesce((p ->> 'retime_open')::boolean, false) then
    update public.messages set expires_at = now()
     where lesson_id = v_id and status = 'queued'
       and dedup_key ~ '^(booking_confirmation|lesson_reminder|lesson_reminder_24h|teacher_lesson_reminder):';
    update public.messages set dedup_key = dedup_key || ':old:' || gen_random_uuid()::text
     where lesson_id = v_id
       and dedup_key ~ '^(booking_confirmation|lesson_reminder|lesson_reminder_24h|teacher_lesson_reminder):';
    update public.push_notifications set dedup_key = dedup_key || ':old:' || gen_random_uuid()::text
     where dedup_key like 'lesson_needs_confirmation:' || v_id::text || ':%'
        or dedup_key like 'lesson_starting:lesson:' || v_id::text || ':%'
        or dedup_key like 'lesson_live:lesson:' || v_id::text || ':%';
  end if;

  -- A held lesson with a new start or length: the PDF is re-rendered by the 60 s job (its header
  -- reads the lesson live). report_ready stays deduped per report: the guardian is not re-sent it.
  if coalesce((p ->> 'refresh_pdf')::boolean, false) then
    update public.lesson_reports set pdf_status = 'pending', pdf_error = null
     where lesson_id = v_id and status = 'submitted' and pdf_status in ('ready', 'failed', 'rendering');
  end if;

  insert into public.messages (direction, phone_e164, guardian_id, lesson_id, template_key,
                               template_params, status, dedup_key, scheduled_for, created_by)
  select 'outbound', m.phone_e164, m.guardian_id, m.lesson_id, m.template_key,
         m.template_params, 'queued', m.dedup_key, now(), v_actor
  from jsonb_to_recordset(coalesce(p -> 'messages', '[]'::jsonb)) as m(
    phone_e164 text, guardian_id uuid, lesson_id uuid, template_key text,
    template_params jsonb, dedup_key text)
  on conflict (dedup_key) do nothing;

  -- The teacher already proposed exactly this start: the edit answers it.
  update public.lesson_proposals
     set status = 'approved', decided_by = v_actor, decided_at = now(), new_lesson_id = v_id
   where lesson_id = v_id and status = 'pending' and proposed_starts_at = v_to_start;

  if p ? 'audit' then
    insert into public.audit_log (actor_id, entity, entity_id, action, before, after)
    select v_actor, a.entity, a.entity_id, a.action, a.before, a.after
    from jsonb_to_record(p -> 'audit') as a(entity text, entity_id uuid, action text,
                                            before jsonb, after jsonb);
  end if;
end $$;

revoke execute on function public.edit_lesson_time(jsonb) from public, anon, authenticated;
grant execute on function public.edit_lesson_time(jsonb) to service_role;

create or replace function public.apply_lesson_changes(p jsonb) returns void
  language plpgsql set search_path = '' as $$
declare
  v_actor uuid := (p ->> 'actor')::uuid;
  c record;
begin
  -- The teachers of the lessons it changes too, before any row lock: change_course moves lessons
  -- in one call and inserts in a later one, and edit_lesson_time takes the teacher, then the row.
  perform public.lock_teachers(array(
    select (x ->> 'teacher_id')::uuid from jsonb_array_elements(coalesce(p -> 'lessons', '[]'::jsonb)) x
    union
    select l.teacher_id from public.lessons l
     where l.id in (select (ch ->> 'id')::uuid
                      from jsonb_array_elements(coalesce(p -> 'changes', '[]'::jsonb)) ch)));

  if p ? 'end_rule' then
    -- Ended now when nothing is left: the last day is before today or before the rule starts.
    update public.schedule_rules s
       set ends_on = greatest(s.starts_on, e.ends_on),
           status = case
             when e.ends_on < greatest(s.starts_on, (now() at time zone s.tz)::date) then 'ended'
             else 'active' end::public.schedule_rule_status
      from (select (p -> 'end_rule' ->> 'ends_on')::date as ends_on) e
     where s.id = (p -> 'end_rule' ->> 'id')::uuid and s.status = 'active';
    if not found then
      raise exception 'rule_not_active' using errcode = 'P0001';
    end if;
  end if;

  for c in
    select * from jsonb_to_recordset(coalesce(p -> 'changes', '[]'::jsonb)) as x(
      id uuid, from_status public.lesson_status, to_status public.lesson_status,
      cancel_reason text, confirmed_at timestamptz, confirmed_by uuid,
      attendance public.attendance, chargeable boolean, students jsonb)
  loop
    update public.lessons l
       set status = c.to_status,
           cancel_reason = coalesce(c.cancel_reason, l.cancel_reason),
           confirmed_at = coalesce(c.confirmed_at, l.confirmed_at),
           confirmed_by = coalesce(c.confirmed_by, l.confirmed_by)
     where l.id = c.id and l.status = c.from_status;
    if not found then
      raise exception 'invalid_transition' using errcode = 'P0001', detail = c.id::text;
    end if;
    update public.lesson_students ls
       set attendance = coalesce(c.attendance, ls.attendance),
           chargeable = coalesce(c.chargeable, ls.chargeable)
     where ls.lesson_id = c.id;
    update public.lesson_students ls
       set attendance = coalesce(s.attendance, ls.attendance),
           chargeable = coalesce(s.chargeable, ls.chargeable)
      from jsonb_to_recordset(coalesce(c.students, '[]'::jsonb))
        as s(student_id uuid, attendance public.attendance, chargeable boolean)
     where ls.lesson_id = c.id and ls.student_id = s.student_id;
  end loop;

  if p ? 'new_rule' then
    insert into public.schedule_rules (id, teacher_id, duration_min, start_time_local, tz, byday,
                                       starts_on, ends_on, meeting_link, package,
                                       created_from_lead_id, subscription_id, first_rule_id,
                                       created_by)
    select r.id, r.teacher_id, r.duration_min, r.start_time_local, r.tz, r.byday, r.starts_on,
           r.ends_on, r.meeting_link, r.package, r.created_from_lead_id, r.subscription_id,
           r.first_rule_id, v_actor
    from jsonb_to_record(p -> 'new_rule') as r(
      id uuid, teacher_id uuid, duration_min smallint, start_time_local time, tz text,
      byday smallint[], starts_on date, ends_on date, meeting_link text,
      package public.package_size, created_from_lead_id uuid, subscription_id uuid,
      first_rule_id uuid);
    insert into public.schedule_rule_students (rule_id, student_id)
    select (p -> 'new_rule' ->> 'id')::uuid, s::uuid
    from jsonb_array_elements_text(p -> 'new_rule' -> 'student_ids') as s;
  end if;

  perform public.raise_teacher_clash(coalesce(p -> 'lessons', '[]'::jsonb));

  insert into public.lessons (id, rule_id, teacher_id, starts_at, ends_at, meeting_link,
                              override_reason, rescheduled_from_id, created_by)
  select x.id, x.rule_id, x.teacher_id, x.starts_at, x.ends_at, x.meeting_link,
         x.override_reason, x.rescheduled_from_id, v_actor
  from jsonb_to_recordset(coalesce(p -> 'lessons', '[]'::jsonb)) as x(
    id uuid, rule_id uuid, teacher_id uuid, starts_at timestamptz, ends_at timestamptz,
    meeting_link text, override_reason text, rescheduled_from_id uuid);
  insert into public.lesson_students (lesson_id, student_id)
  select x.id, s::uuid
  from jsonb_to_recordset(coalesce(p -> 'lessons', '[]'::jsonb)) as x(id uuid, student_ids jsonb)
  cross join lateral jsonb_array_elements_text(x.student_ids) as s;

  insert into public.messages (direction, phone_e164, guardian_id, lesson_id, template_key,
                               template_params, status, dedup_key, scheduled_for, created_by)
  select 'outbound', m.phone_e164, m.guardian_id, m.lesson_id, m.template_key,
         m.template_params, 'queued', m.dedup_key, now(), v_actor
  from jsonb_to_recordset(coalesce(p -> 'messages', '[]'::jsonb)) as m(
    phone_e164 text, guardian_id uuid, lesson_id uuid, template_key text,
    template_params jsonb, dedup_key text)
  on conflict (dedup_key) do nothing;

  if p ? 'audit' then
    insert into public.audit_log (actor_id, entity, entity_id, action, before, after)
    select v_actor, a.entity, a.entity_id, a.action, a.before, a.after
    from jsonb_to_record(p -> 'audit') as a(entity text, entity_id uuid, action text,
                                            before jsonb, after jsonb);
  end if;
end $$;

revoke execute on function public.apply_lesson_changes(jsonb) from public, anon, authenticated;
grant execute on function public.apply_lesson_changes(jsonb) to service_role;
