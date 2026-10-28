-- generate_rule_lessons (body of migration 110) skips a student whose open course pause (migration 950) covers
-- the lesson's Riyadh day: a group rule stays active for the other students while one of them is paused (docs/11
-- §7b). A rule whose only student is paused is itself 'paused' once the pause began (rule_not_active); before
-- that (a pause from a later day) and whenever every student of a rule is paused that day, no lesson row is made.
-- Everything else is unchanged: locked rule, `on conflict do nothing`, the rows that were new.
-- Rollback: re-run the function of migration 20261001000110.
set local lock_timeout = '5s';

create or replace function public.generate_rule_lessons(p_rule uuid, p_lessons jsonb, p_actor uuid)
  returns setof public.lessons language plpgsql set search_path = '' as $$
declare
  r public.schedule_rules;
begin
  -- Serialises with cancel / reschedule / course pause of the same rule (they lock the same row).
  select * into r from public.schedule_rules s where s.id = p_rule for update;
  if r.id is null or r.status <> 'active' then
    raise exception 'rule_not_active' using errcode = 'P0001';
  end if;

  return query
  with ins as (
    insert into public.lessons as l (rule_id, teacher_id, starts_at, ends_at, meeting_link, created_by)
    select p_rule, r.teacher_id, o.starts_at, o.ends_at, o.meeting_link, p_actor
    from jsonb_to_recordset(p_lessons) as o(starts_at timestamptz, ends_at timestamptz, meeting_link text)
    -- Never a lesson with nobody on it: when every student of the rule is paused that day, no row (a rule
    -- without students generates as before).
    where not exists (select 1 from public.schedule_rule_students rs where rs.rule_id = p_rule)
       or exists (
         select 1 from public.schedule_rule_students rs
         where rs.rule_id = p_rule and not exists (
           select 1 from public.course_pauses c
           where c.student_id = rs.student_id and c.resumed_at is null
             and o.starts_at >= (c.from_date::timestamp at time zone 'Asia/Riyadh')
             and (c.until_date is null or o.starts_at < ((c.until_date + 1)::timestamp at time zone 'Asia/Riyadh'))))
    on conflict do nothing
    returning l.*
  ), students as (
    insert into public.lesson_students (lesson_id, student_id)
    select ins.id, rs.student_id
    from ins cross join public.schedule_rule_students rs
    where rs.rule_id = p_rule
      and not exists (
        select 1 from public.course_pauses c
        where c.student_id = rs.student_id and c.resumed_at is null
          and ins.starts_at >= (c.from_date::timestamp at time zone 'Asia/Riyadh')
          and (c.until_date is null or ins.starts_at < ((c.until_date + 1)::timestamp at time zone 'Asia/Riyadh')))
  )
  select * from ins order by ins.starts_at;
end $$;
