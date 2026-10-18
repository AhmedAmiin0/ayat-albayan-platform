-- The assistant's course is tied to the subscription it books (PR #113 review M3, owner 2026-10-18:
-- exactly lessons_total lessons per paid plan). Without the tie a second course could be booked on
-- the same subscription once the first one ended.
--   * schedule_rules.subscription_id: set on EVERY rule of an assistant course (the first rule and its
--     siblings); null for the admin's bookings, trials, makeups and imported rules. A deleted
--     subscription leaves its rules (set null).
--   * create_booking v6 (copy of migration 460): rule.subscription_id and each sibling's
--     rule.subscription_id are inserted. A payload without it behaves exactly as before.
-- SQL test plan (local DB, begin … rollback; e2e/tests/assistant-course-subscription.sql.spec.ts):
--   1. a payload with rule.subscription_id and one sibling → both rules carry it.
--   2. a payload without it → subscription_id null, as before.

alter table public.schedule_rules
  add column subscription_id uuid references public.subscriptions (id) on delete set null;
create index schedule_rules_subscription_idx on public.schedule_rules (subscription_id)
  where subscription_id is not null;

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
