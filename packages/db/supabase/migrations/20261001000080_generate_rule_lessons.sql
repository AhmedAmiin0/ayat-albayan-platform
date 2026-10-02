-- OccurrenceGenerator persistence (R-SCH-02, issue B1, rule 8). The API computes a rule's
-- occurrences (ruleOccurrences, DST-safe) and passes them here; this function inserts them with
-- `on conflict (rule_id, starts_at) do nothing`, so a re-run never duplicates a lesson and never
-- overwrites one: a cancelled / rescheduled row at a slot is what keeps that slot from coming back.
-- Students are copied from schedule_rule_students onto the newly inserted lessons only.
-- Returns the inserted rows (empty on a re-run). Called by the API (service role) only.
create function public.generate_rule_lessons(p_rule uuid, p_lessons jsonb, p_actor uuid)
  returns setof public.lessons language plpgsql set search_path = '' as $$
declare
  r public.schedule_rules;
begin
  -- Serialises with cancel / reschedule of the same rule (they end it under the same row lock).
  select * into r from public.schedule_rules s where s.id = p_rule for update;
  if r.id is null or r.status <> 'active' then
    raise exception 'rule_not_active' using errcode = 'P0001';
  end if;

  return query
  with ins as (
    insert into public.lessons as l (rule_id, teacher_id, starts_at, ends_at, meeting_link, created_by)
    select p_rule, r.teacher_id, o.starts_at, o.ends_at, o.meeting_link, p_actor
    from jsonb_to_recordset(p_lessons) as o(starts_at timestamptz, ends_at timestamptz, meeting_link text)
    on conflict (rule_id, starts_at) do nothing
    returning l.*
  ), students as (
    insert into public.lesson_students (lesson_id, student_id)
    select ins.id, rs.student_id
    from ins cross join public.schedule_rule_students rs
    where rs.rule_id = p_rule
  )
  select * from ins order by ins.starts_at;
end $$;

revoke execute on function public.generate_rule_lessons(uuid, jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.generate_rule_lessons(uuid, jsonb, uuid) to service_role;
