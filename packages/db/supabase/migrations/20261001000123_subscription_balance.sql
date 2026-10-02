-- Package balance, derived, never typed (R-SUB-01, R-SUB-03; issues E1, B5). Mirrored by
-- @ab/shared money/usage.ts (consumesPackage, allocateUsage), whose tests pin the same rules.
--
-- A lesson CONSUMES one unit of a student's packages when, for that student:
--   1. lesson_students.chargeable is true (set by isChargeable at the outcome: teacher/admin
--      cancels and moves are false; a student's excuse is true only as a late cancel), and
--   2. the lesson has an outcome: status completed | late | no_show | excused
--      (scheduled / confirmed keep chargeable's default true but have not happened yet), and
--   3. it is not the free trial (its rule's package is not 'trial'; docs/08 «جلسة تجريبية مجانية»), and
--   4. its local date in the student's tz is on or after the student's first subscription start.
-- Units are allocated FIFO: consuming lessons in time order fill the student's subscriptions in
-- (starts_on, created_at) order, each up to lessons_total. Lessons past every package land on the
-- newest one, whose remaining goes negative (attended while unpaid). So a renewal bought early
-- (R-SUB-02 fires at 2 left) starts only when the previous package is used up, and the end date
-- follows real lessons, not the purchase date (R-SUB-03).
-- TODO(R-SUB-01): owner to confirm that lessons attended past the package are charged to the next
-- package (FIFO), and that `late` / `no_show` consume a lesson like `completed` (isChargeable).
create view public.v_package_lessons with (security_invoker = true) as
  select ls.student_id, ls.lesson_id, l.starts_at,
         row_number() over (partition by ls.student_id order by l.starts_at, l.id)::int as n
  from public.lesson_students ls
  join public.lessons l on l.id = ls.lesson_id
  join public.students st on st.id = ls.student_id
  left join public.schedule_rules r on r.id = l.rule_id
  where ls.chargeable
    and l.status in ('completed', 'late', 'no_show', 'excused')
    and r.package is distinct from 'trial'
    and (l.starts_at at time zone st.tz)::date >=
        (select min(s.starts_on) from public.subscriptions s where s.student_id = ls.student_id);

create view public.v_subscription_balance with (security_invoker = true) as
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
    -- Same rules 1, 3 and 4 as v_package_lessons, for lessons that have no outcome yet.
    select ls.student_id, l.starts_at,
           row_number() over (partition by ls.student_id order by l.starts_at, l.id)::int as m
    from public.lesson_students ls
    join public.lessons l on l.id = ls.lesson_id
    join public.students st on st.id = ls.student_id
    left join public.schedule_rules r on r.id = l.rule_id
    where ls.chargeable and l.status in ('scheduled', 'confirmed')
      and r.package is distinct from 'trial'
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

-- security_invoker views give partial answers under a teacher's or guardian's RLS (other teachers'
-- lessons and rules are hidden), so only the API (service role) reads them; it guards per role.
revoke all on public.v_package_lessons, public.v_subscription_balance from anon, authenticated;
grant select on public.v_package_lessons, public.v_subscription_balance to service_role;

-- Phase 3 settings (read through SettingsService; a missing row reads as the default below).
-- renewal_alert_remaining: R-SUB-02 «2 lessons remaining» → renewal reminder + admin task.
-- flag_future_lessons_when_unpaid: R-SUB-02 at 0 remaining future lessons are flagged, never
--   auto-cancelled.
-- report_teacher_edit_hours: R-REP-02 a teacher edits a submitted report for 24 h; admins always.
-- reporting_currency: dashboard money totals (R-RPT-02), converted with fx_rates.
-- payout_count_late / payout_count_no_show: R-PAY-02 pays `completed` lessons; whether a late or
--   no-show lesson is paid is an open owner question, so both stay OFF (rule: unknown → off).
insert into public.settings (key, value) values
  ('renewal_alert_remaining', '2'::jsonb),
  ('flag_future_lessons_when_unpaid', 'true'::jsonb),
  ('report_teacher_edit_hours', '24'::jsonb),
  ('reporting_currency', '"SAR"'::jsonb),
  ('payout_count_late', 'false'::jsonb),
  ('payout_count_no_show', 'false'::jsonb)
on conflict (key) do nothing;
