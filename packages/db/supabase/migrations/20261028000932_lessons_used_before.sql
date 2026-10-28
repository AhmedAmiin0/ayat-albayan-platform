-- Lessons taken before the platform (owner 2026-10-28: «i need a way to add number of used lessons if
-- start date switch is on»). A package sold with «بدأ الاشتراك سابقًا» may already have lessons the student
-- took outside the platform: subscriptions.lessons_used_before counts them (0 by default, never the whole
-- package: at least one lesson is left to book). The API accepts it only with a start before the academy's
-- today (subscriptions.set_start_date); courses book lessons_total − lessons_used_before lessons.
-- v_subscription_balance (latest definition: migration 190, same columns, same order, same grants) now:
--   * fills each package FIFO up to its platform capacity, lessons_total − lessons_used_before;
--   * lessons_used = the platform lessons it took + lessons_used_before, remaining = total − used;
--   * ended_at / projected_end_at follow the capacity (the capacity-th platform lesson ends it);
--   * appends lessons_used_before as the last column (create or replace keeps every reader:
--     v_student_list, BalanceQueries, reports, the dashboard, the sales history).
-- SQL test plan (local DB, begin … rollback):
--   1. an 8-lesson package with lessons_used_before 1 and no lessons: lessons_used 1, remaining 7.
--   2. seven completed lessons after starts_on: lessons_used 8, remaining 0, ended_at = the 7th.
--   3. lessons_used_before 8 on an 8-lesson package: 23514 (check violation); -1: 23514.
--   4. two packages (8 with 1 before, then 8): the 8th platform lesson lands on the second package.
alter table public.subscriptions
  add column lessons_used_before smallint not null default 0,
  add constraint subscriptions_lessons_used_before_check
    check (lessons_used_before >= 0 and lessons_used_before < lessons_total);

comment on column public.subscriptions.lessons_used_before is
  'Lessons of this package taken before the platform (owner 2026-10-28); counted in v_subscription_balance.lessons_used.';

create or replace view public.v_subscription_balance with (security_invoker = true) as
  with subs as (
    select s.id, s.student_id, s.lessons_total, s.lessons_used_before::int as before,
           coalesce(sum(s.lessons_total - s.lessons_used_before)
             over (w rows between unbounded preceding and 1 preceding), 0)::int as cap_from,
           (sum(s.lessons_total - s.lessons_used_before)
             over (w rows between unbounded preceding and current row))::int as cap_to,
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
           subs.before +
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
            where o.student_id = b.student_id and o.m = b.cap_to - b.used_all) end as projected_end_at,
         b.before as lessons_used_before
  from b;

revoke all on public.v_subscription_balance from anon, authenticated;
grant select on public.v_subscription_balance to service_role;
