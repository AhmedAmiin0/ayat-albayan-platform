-- Students list filters (R-STU-01): one row per student with the facts the admin filters on, so
-- every filter is a single PostgREST eq/in/is on GET /students (no N+1, no stacked or=()).
-- Package facts come from the student's newest package (v_subscription_balance.is_last):
--   has_package    = remaining > 0 («لها باقة سارية»); false covers no package and an exhausted one.
--   low_balance    = has a package and remaining <= settings.renewal_alert_remaining (default 2).
--   package_unpaid = the newest package's status is 'unpaid'.
-- has_weekly = on at least one active schedule rule («له حلقة أسبوعية»).
-- ponytail: count=exact runs the balance view's window over all subscriptions per page load;
-- fine at academy scale (hundreds of students).
create or replace view public.v_student_list with (security_invoker = true) as
  with threshold as (
    select coalesce(
      (select case when jsonb_typeof(value) = 'number' and (value #>> '{}')::numeric >= 0
                   then (value #>> '{}')::numeric::int end
       from public.settings where key = 'renewal_alert_remaining'), 2) as n
  )
  select s.id, s.code, s.name, s.name_normalized, s.status, s.program, s.tz, s.created_at,
         s.guardian_id, s.teacher_id,
         b.remaining as package_remaining,
         coalesce(b.remaining > 0, false) as has_package,
         (b.remaining is not null and b.remaining <= (select n from threshold)) as low_balance,
         coalesce(sub.status = 'unpaid', false) as package_unpaid,
         exists (
           select 1 from public.schedule_rule_students rs
           join public.schedule_rules r on r.id = rs.rule_id
           where rs.student_id = s.id and r.status = 'active'
         ) as has_weekly
  from public.students s
  left join public.v_subscription_balance b on b.student_id = s.id and b.is_last
  left join public.subscriptions sub on sub.id = b.subscription_id;

grant select on public.v_student_list to service_role;
