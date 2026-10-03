-- create_booking v3 (R-SCH-10, R-PAY-03). Changes from migration 111:
--   * p_booking.makeup_of: the missed lesson a makeup replaces. 'makeup_not_eligible' (P0001)
--     unless that lesson has this student chargeable with status no_show | excused. A second
--     active makeup of one lesson hits lessons_makeup_of_key (23505; the API maps it to 409).
--   * p_booking.invoice {path, mime, size_bytes, source, message_id, kind}: stored in `invoices`
--     with the rule, in the same transaction. A replay (same client_request_id) returns early,
--     so it is idempotent. Required by the API for every kind but trial.
--   * booking_result() adds invoice_id; the audit row gets kind and invoice_source.
-- SQL test plan (local DB, begin … rollback):
--   1. a completed makeup with chargeable = true is not in v_package_lessons (migration 172).
--   2. a second active makeup of one lesson raises 23505; after cancelling the first it works.
--   3. apply_lesson_changes moving a makeup lesson keeps makeup_of_id (trigger, migration 170).
--   4. the same payload twice with one client_request_id → 1 rule, 1 invoice, equal results.
--   5. makeup of a completed lesson, or of another student's lesson → makeup_not_eligible.
--   6. invoices is empty under a teacher or guardian JWT.

create or replace function public.booking_result(p_rule uuid) returns jsonb
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
                        and m.dedup_key like 'booking_confirmation:%'),
    'invoice_id', (select i.id from public.invoices i where i.rule_id = p_rule limit 1))
$$;

create or replace function public.create_booking(p_booking jsonb, p_actor uuid)
  returns jsonb language plpgsql set search_path = '' as $$
declare
  v_lead uuid := (p_booking #>> '{lead,id}')::uuid;
  v_request uuid := (p_booking #>> '{rule,client_request_id}')::uuid;
  v_makeup uuid := (p_booking ->> 'makeup_of')::uuid;
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

  if v_makeup is not null and not exists (
    select 1 from public.lessons l
      join public.lesson_students ls on ls.lesson_id = l.id
      where l.id = v_makeup and ls.student_id = v_students[1] and ls.chargeable
        and l.status in ('no_show', 'excused')
  ) then
    raise exception 'makeup_not_eligible' using errcode = 'P0001';
  end if;
  if v_makeup is not null and exists (
    select 1 from public.lessons l where l.makeup_of_id = v_makeup
      and l.status not in ('cancelled_by_teacher', 'cancelled_by_admin', 'rescheduled')
  ) then
    raise exception 'duplicate key value violates unique index "lessons_makeup_of_key"'
      using errcode = '23505';
  end if;
  if jsonb_typeof(p_booking -> 'invoice') = 'object' and v_request is null then
    raise exception 'invoice needs rule.client_request_id' using errcode = '22023';
  end if;

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
  -- Tagged after the insert: `on conflict do nothing` above would swallow lessons_makeup_of_key.
  if v_makeup is not null then
    update public.lessons set makeup_of_id = v_makeup where id = v_first;
  end if;
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
                              'lessons', jsonb_array_length(v_lessons)));

  return public.booking_result(v_rule);
end $$;
