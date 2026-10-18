-- apply_lesson_changes v3 (PR #113 review): an exact copy of v2 (migration 20261001000112) plus
-- new_rule.subscription_id and new_rule.first_rule_id. A whole-rule reschedule of the assistant's
-- course writes its replacement with the course's subscription (migration 470) and, for one of a
-- booking's other times, its first rule (migration 465), so a second reschedule still keeps the
-- course's last day. A new_rule without them stores null, as before.
-- SQL test plan (local DB, begin … rollback; e2e/tests/apply-lesson-changes-v3.sql.spec.ts):
--   1. a new_rule carrying subscription_id → the inserted rule stores it.
--   2. a new_rule without it → subscription_id null.
create or replace function public.apply_lesson_changes(p jsonb) returns void
  language plpgsql set search_path = '' as $$
declare
  v_actor uuid := (p ->> 'actor')::uuid;
  c record;
begin
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
