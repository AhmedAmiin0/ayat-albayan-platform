-- Meetings, step 1: «افتح الحلقة الآن» and «حلقة فورية». Both are lessons (the classroom is keyed on
-- lesson_id everywhere), so no new entity:
--   lessons.room_opened_at: staff opened the room early. The join window then opens at
--     min(room_opened_at, starts_at - 15 min) (@ab/shared joinWindow); null = the usual window.
--   lessons.instant: an ad-hoc lesson started now by an admin (POST /lessons/instant). It never
--     consumes a package unit. lesson_students.chargeable cannot carry that (every outcome rewrites
--     it, see migration 172), so the exclusion is read from the lesson, like a makeup. It still counts
--     in v_lesson_sequence, in teacher earnings (183) and payouts (status only): the teacher taught.
--   create_instant_lesson: create_booking (the one booking transaction) + the two flags, atomically.
-- SQL test plan (local DB, begin … rollback):
--   1. create_instant_lesson with one student → one lesson, instant, room_opened_at set,
--      lesson_students.chargeable false, no messages row; a replay with the same client_request_id
--      returns the same lesson.
--   2. mark it completed with chargeable true: v_package_lessons has no row for it.
--   3. reschedule it (rescheduled_from_id set): the new row is instant too.
alter table public.lessons
  add column room_opened_at timestamptz,
  add column instant boolean not null default false;

-- A moved instant lesson stays instant (same idea as lessons_makeup_inherit, migration 173).
create function public.lessons_instant_inherit() returns trigger
  language plpgsql set search_path = '' as $$
begin
  if new.rescheduled_from_id is not null and not new.instant then
    select l.instant into new.instant from public.lessons l where l.id = new.rescheduled_from_id;
    new.instant := coalesce(new.instant, false);
  end if;
  return new;
end $$;
create trigger lessons_instant_inherit before insert on public.lessons
  for each row execute function public.lessons_instant_inherit();

-- Same columns as 172 (create or replace), one more exclusion: not an instant lesson.
create or replace view public.v_package_lessons with (security_invoker = true) as
  select ls.student_id, ls.lesson_id, l.starts_at,
         row_number() over (partition by ls.student_id order by l.starts_at, l.id)::int as n
  from public.lesson_students ls
  join public.lessons l on l.id = ls.lesson_id
  join public.students st on st.id = ls.student_id
  left join public.schedule_rules r on r.id = l.rule_id
  where ls.chargeable
    and l.status in ('completed', 'late', 'no_show', 'excused')
    and r.package is distinct from 'trial'
    and l.makeup_of_id is null
    and not l.instant
    and (l.starts_at at time zone st.tz)::date >=
        (select min(s.starts_on) from public.subscriptions s where s.student_id = ls.student_id);

create or replace view public.v_subscription_balance with (security_invoker = true) as
  with subs as (
    select s.id, s.student_id, s.lessons_total,
           coalesce(sum(s.lessons_total) over (w rows between unbounded preceding and 1 preceding), 0)::int
             as cap_from,
           (sum(s.lessons_total) over (w rows between unbounded preceding and current row))::int as cap_to,
           lead(s.id) over w is null as is_last
    from public.subscriptions s
    window w as (partition by s.student_id order by s.starts_on, s.created_at, s.id)
  ), usage as (
    select p.student_id, count(*)::int as used from public.v_package_lessons p group by p.student_id
  ), open_lessons as (
    select ls.student_id, l.starts_at,
           row_number() over (partition by ls.student_id order by l.starts_at, l.id)::int as m
    from public.lesson_students ls
    join public.lessons l on l.id = ls.lesson_id
    join public.students st on st.id = ls.student_id
    left join public.schedule_rules r on r.id = l.rule_id
    where ls.chargeable and l.status in ('scheduled', 'confirmed')
      and r.package is distinct from 'trial'
      and l.makeup_of_id is null
      and not l.instant
      and (l.starts_at at time zone st.tz)::date >=
          (select min(s.starts_on) from public.subscriptions s where s.student_id = ls.student_id)
  ), b as (
    select subs.*, coalesce(u.used, 0) as used_all,
           case when subs.is_last then greatest(0, coalesce(u.used, 0) - subs.cap_from)
                else greatest(0, least(coalesce(u.used, 0), subs.cap_to) - subs.cap_from) end as used
    from subs left join usage u on u.student_id = subs.student_id
  )
  select b.id as subscription_id, b.student_id, b.lessons_total,
         b.used as lessons_used,
         b.lessons_total - b.used as remaining,
         b.is_last,
         (select p.starts_at from public.v_package_lessons p
          where p.student_id = b.student_id and p.n = b.cap_to) as ended_at,
         case when b.cap_to > b.used_all then
           (select o.starts_at from open_lessons o
            where o.student_id = b.student_id and o.m = b.cap_to - b.used_all) end as projected_end_at
  from b;

-- The booking transaction, then the instant flags on its one lesson, in the same transaction. The
-- API sends a one-day rule with package null (like a makeup), no messages, no invoice, no lead.
create function public.create_instant_lesson(p_booking jsonb, p_actor uuid)
  returns jsonb language plpgsql set search_path = '' as $$
declare
  v_result jsonb;
  v_lesson uuid;
begin
  v_result := public.create_booking(p_booking, p_actor);
  v_lesson := (v_result #>> '{lessons,0,id}')::uuid;
  update public.lessons set instant = true, room_opened_at = coalesce(room_opened_at, now())
    where id = v_lesson;
  update public.lesson_students set chargeable = false where lesson_id = v_lesson and chargeable;
  return v_result;
end $$;
revoke execute on function public.create_instant_lesson(jsonb, uuid) from public, anon, authenticated;
grant execute on function public.create_instant_lesson(jsonb, uuid) to service_role;
