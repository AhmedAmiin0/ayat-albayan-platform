-- Ended lessons count on the package (owner 2026-11-03: «leave the default status to confirm and leave the
-- logic as is, but count it on used lessons, and if the student didn't reply after the reminder message
-- mark him as absent»). Confirmation stays required by default (settings.lesson_confirmation_required,
-- code default ON); the API job (AutoHeldService) settles a lesson once it ended + the grace
-- (settings.lesson_outcome_grace_minutes): confirmed → completed; scheduled with the family's platform
-- reminder sent and no «نعم» → no_show; scheduled without one stays «يحتاج تأكيد» for the assistant.
--   1. lesson_outcomes_since(): the instant this migration ran (the deploy), baked once. Neither the
--      counting below nor the job ever reaches a lesson that ended before it (no retro change).
--   2. lesson_ended_open(status, ends_at): still scheduled / confirmed, ended by now(), after the cutoff.
--   3. v_package_lessons counts those like an outcome (same chargeable / trial / makeup / instant / package
--      start rules: cancelled_by_teacher, cancelled_by_admin, rescheduled and a non-late excused stay out
--      through their status or lesson_students.chargeable). v_subscription_balance: same body as 991, its
--      open_lessons (the projection) no longer holds them, so no lesson is counted twice.
-- SQL test plan (local DB, begin … rollback): an 8-lesson package with one scheduled lesson that ended
--   after the cutoff: lessons_used 1, remaining 7, projected_end_at skips it; the same lesson ended before
--   the cutoff: lessons_used 0; cancelled_by_teacher: 0; the job moving it to no_show keeps lessons_used 1.
-- Rollback: re-run 991's two views; drop lesson_ended_open, lesson_outcomes_since. Idempotent.
set local lock_timeout = '5s';

do $do$
begin
  if to_regprocedure('public.lesson_outcomes_since()') is null then
    execute format(
      $f$create function public.lesson_outcomes_since() returns timestamptz
           language sql immutable set search_path = '' as $b$ select %L::timestamptz $b$$f$,
      now());
  end if;
end
$do$;

comment on function public.lesson_outcomes_since() is
  'When ended lessons started to count without an outcome (migration 999 = the deploy). Never moved.';

create or replace function public.lesson_ended_open(p_status public.lesson_status, p_ends_at timestamptz)
  returns boolean language sql stable set search_path = '' as $$
  select p_status in ('scheduled', 'confirmed')
     and p_ends_at <= now()
     and p_ends_at >= public.lesson_outcomes_since();
$$;

revoke all on function public.lesson_outcomes_since(), public.lesson_ended_open(public.lesson_status, timestamptz)
  from public, anon, authenticated;
grant execute on function public.lesson_outcomes_since(), public.lesson_ended_open(public.lesson_status, timestamptz)
  to service_role;

create or replace view public.v_package_lessons with (security_invoker = true) as
  select ls.student_id, ls.lesson_id, l.starts_at,
         row_number() over (partition by ls.student_id order by l.starts_at, l.id)::int as n
  from public.lesson_students ls
  join public.lessons l on l.id = ls.lesson_id
  join public.students st on st.id = ls.student_id
  left join public.schedule_rules r on r.id = l.rule_id
  where ls.chargeable
    and (l.status in ('completed', 'late', 'no_show', 'excused')
         or public.lesson_ended_open(l.status, l.ends_at))
    and r.package is distinct from 'trial'
    and l.makeup_of_id is null
    and not l.instant
    and (l.starts_at at time zone st.tz)::date >=
        (select min(s.starts_on) from public.subscriptions s
         where s.student_id = ls.student_id and (s.status <> 'cancelled' or s.cancel_kind = 'stopped'));

create or replace view public.v_subscription_balance with (security_invoker = true) as
  with pkgs as (
    -- A stopped package holds what it used at the stop (lessons_used_at_stop), never the next one's lessons.
    select s.id, s.student_id, s.lessons_total, s.lessons_used_before, s.starts_on, s.created_at,
           case when s.cancel_kind = 'stopped' then coalesce(s.lessons_used_at_stop, s.lessons_total)
                else s.lessons_total end - s.lessons_used_before as cap
    from public.subscriptions s
    where s.status <> 'cancelled' or s.cancel_kind = 'stopped'
  ), subs as (
    select s.id, s.student_id, s.lessons_total, s.lessons_used_before::int as before,
           coalesce(sum(s.cap) over (w rows between unbounded preceding and 1 preceding), 0)::int as cap_from,
           (sum(s.cap) over (w rows between unbounded preceding and current row))::int as cap_to,
           lead(s.id) over w is null as is_last
    from pkgs s
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
      and not public.lesson_ended_open(l.status, l.ends_at)
      and r.package is distinct from 'trial'
      and l.makeup_of_id is null
      and not l.instant
      and (l.starts_at at time zone st.tz)::date >=
          (select min(s.starts_on) from public.subscriptions s
           where s.student_id = ls.student_id and (s.status <> 'cancelled' or s.cancel_kind = 'stopped'))
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
