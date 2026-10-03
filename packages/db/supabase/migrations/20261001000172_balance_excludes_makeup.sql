-- A makeup lesson (حجز تعويضي, lessons.makeup_of_id) replaces one the package already charged
-- (a student no_show / excuse is chargeable, migration 123), so it never consumes a unit
-- (R-SCH-10). Rule 5 of the balance: not a makeup. lesson_students.chargeable cannot carry it:
-- every outcome rewrites it, so the exclusion is read from the lesson. Same columns as 123, so
-- create or replace works. Mirrored by @ab/shared money/usage.ts (PackageLesson.makeup).
-- It still counts in v_lesson_sequence (lesson numbers) and in teacher payouts (by status only).
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
    -- Booked, not happened yet: where the remaining units will go (projected end).
    -- Same rules as v_package_lessons, for lessons that have no outcome yet.
    select ls.student_id, l.starts_at,
           row_number() over (partition by ls.student_id order by l.starts_at, l.id)::int as m
    from public.lesson_students ls
    join public.lessons l on l.id = ls.lesson_id
    join public.students st on st.id = ls.student_id
    left join public.schedule_rules r on r.id = l.rule_id
    where ls.chargeable and l.status in ('scheduled', 'confirmed')
      and r.package is distinct from 'trial'
      and l.makeup_of_id is null
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
         -- R-SUB-03: when the package's last unit was consumed; null while units are left.
         (select p.starts_at from public.v_package_lessons p
          where p.student_id = b.student_id and p.n = b.cap_to) as ended_at,
         -- When it will be used up if every booked lesson happens; null if not enough are booked.
         case when b.cap_to > b.used_all then
           (select o.starts_at from open_lessons o
            where o.student_id = b.student_id and o.m = b.cap_to - b.used_all) end as projected_end_at
  from b;
