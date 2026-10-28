-- «إلغاء الباقة», step 2 of 2 (owner 2026-10-28; 933 added the value, which may only be used from here):
-- every SQL reader that must ignore a cancelled package. A cancelled package is never owed, never the
-- newest / current one, never bookable, never paid into and never earns commission.
--   * v_package_lessons / v_subscription_balance: a cancelled package takes no FIFO capacity and no longer
--     moves the start date (min(starts_on)); it has no balance row. So is_last (the newest package of
--     v_student_list: has_package, low_balance, package_unpaid) is the newest non-cancelled one.
--   * subscription_full_at: null for a cancelled package (never fully paid → never a commission).
--   * subscription_commission_kind: a cancelled package is no kind and never makes a later one a
--     'renewal' (the owner's case: a mistaken package two minutes before the right one).
--   * portal_packages: the family never sees a cancelled package.
--   * Backstops (23514): no payment row and no schedule rule may point at a cancelled package, a package
--     with money, lessons (linked to its course or used FIFO) or a later package's commission cannot
--     become cancelled, a cancelled one never leaves it, its payments are frozen.
-- SQL test plan (local DB, begin … rollback):
--   1. student with packages A (cancelled, 8) then B (8), 3 held lessons → B used 3, A absent from
--      v_subscription_balance; v_student_list.package_unpaid follows B.
--   2. subscription_commission_kind(B) = 'first'; subscription_full_at(A) is null.
--   3. insert into payments (subscription_id = A …) → 23514; insert a schedule rule with A → 23514.
--   4. portal_packages shows B only.
--   5. update B set status = 'cancelled' with a payment on B → 23514 has_payments; with a held lesson on a
--      rule of B, or an active rule of B → 23514 has_lessons.
--      Admin-booked lessons (rule without subscription_id) held on B → 23514 has_lessons; a mistaken
--      duplicate with only future projected lessons → cancelled, the lessons move to the other package.
--   5b. pay B in full (assistant_commissions row on B, kind 'renewal'), then cancel A → 23514 has_commission.
--   6. update A set status = 'paused' → 23514 already_cancelled; update / delete a payment of A → 23514.
-- Rollback: re-run the view bodies of 190 (v_package_lessons) / 932 (v_subscription_balance) / 790 and the functions of 272 / 751; drop the five triggers and their functions.
set local lock_timeout = '5s';

-- Same columns as 190 (create or replace); cancelled packages are left out.
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
        (select min(s.starts_on) from public.subscriptions s
         where s.student_id = ls.student_id and s.status <> 'cancelled');

-- Same columns as 932 (its newest definition: capacity lessons_total − lessons_used_before, lessons_used
-- adds lessons_used_before, last column lessons_used_before); cancelled packages are left out.
create or replace view public.v_subscription_balance with (security_invoker = true) as
  with subs as (
    select s.id, s.student_id, s.lessons_total, s.lessons_used_before::int as before,
           coalesce(sum(s.lessons_total - s.lessons_used_before)
             over (w rows between unbounded preceding and 1 preceding), 0)::int as cap_from,
           (sum(s.lessons_total - s.lessons_used_before)
             over (w rows between unbounded preceding and current row))::int as cap_to,
           lead(s.id) over w is null as is_last
    from public.subscriptions s
    where s.status <> 'cancelled'
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
          (select min(s.starts_on) from public.subscriptions s
           where s.student_id = ls.student_id and s.status <> 'cancelled')
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

-- Same as 272, plus: a cancelled package is never fully paid.
create or replace function public.subscription_full_at(p_subscription uuid) returns timestamptz
  language sql stable set search_path = '' as $$
  with price as (
    select s.price from public.subscriptions s where s.id = p_subscription and s.status <> 'cancelled'
  ), run as (
    select p.paid_at,
           row_number() over w as n,
           sum(case when p.kind = 'refund' then -p.amount else p.amount end) over w as net
    from public.payments p where p.subscription_id = p_subscription
    window w as (order by p.paid_at, p.created_at, p.id)
  )
  select case
    when (select price from price) > 0
         and coalesce((select r.net from run r order by r.n desc limit 1), 0) >= (select price from price)
    then (select min(r.paid_at) from run r
          where r.n > coalesce((select max(x.n) from run x where x.net < (select price from price)), 0))
  end
$$;

-- Same as 751, plus: a cancelled package is no kind, and never counts as an earlier priced one.
create or replace function public.subscription_commission_kind(p_subscription uuid) returns text
  language sql stable set search_path = '' as $$
  select case when s.price > 0 and s.status <> 'cancelled' then
           case when exists (select 1 from public.subscriptions o
                              where o.student_id = s.student_id and o.price > 0 and o.id <> s.id
                                and o.status <> 'cancelled'
                                and (o.created_at, o.id) < (s.created_at, s.id))
                then 'renewal' else 'first' end
         end
  from public.subscriptions s where s.id = p_subscription
$$;

-- Same columns as 790; a cancelled package is not the family's.
create or replace view public.portal_packages with (security_invoker = false) as
  select p.id, p.student_id, p.package, p.duration, p.lessons_total, p.starts_on, p.renews_on, p.status, p.created_at
  from public.subscriptions p
  where p.student_id in (select public.portal_student_ids()) and p.status <> 'cancelled';

-- Backstops (the API answers 409 first; these close the race between two requests). Both sides lock the
-- package row, so a payment / course rule and a cancel of the same package are serialised.
-- 1. Nothing new hangs on a cancelled package (a payment, or a schedule rule of its course).
create or replace function public.refuse_cancelled_subscription() returns trigger
  language plpgsql set search_path = '' as $$
declare
  v_status public.subscription_status;
begin
  if new.subscription_id is null then
    return new;
  end if;
  select s.status into v_status from public.subscriptions s where s.id = new.subscription_id for share;
  if v_status = 'cancelled' then
    raise exception 'subscription % is cancelled', new.subscription_id using errcode = '23514';
  end if;
  return new;
end $$;
revoke all on function public.refuse_cancelled_subscription() from public, anon, authenticated;

drop trigger if exists payments_refuse_cancelled on public.payments;
create trigger payments_refuse_cancelled before insert or update of subscription_id on public.payments
  for each row execute function public.refuse_cancelled_subscription();
drop trigger if exists schedule_rules_refuse_cancelled on public.schedule_rules;
create trigger schedule_rules_refuse_cancelled before insert or update of subscription_id on public.schedule_rules
  for each row execute function public.refuse_cancelled_subscription();

-- 2. Only a package nothing hangs on may become cancelled: net paid 0 (has_payments) and no lesson that is
--    not cancelled on a rule of its course, nor an active rule of it (has_lessons). The message carries the
--    API's 409 code.
create or replace function public.subscription_cancel_guard() returns trigger
  language plpgsql set search_path = '' as $$
begin
  perform 1 from public.subscriptions s where s.id = new.id for update;
  if coalesce((select sum(case when p.kind = 'refund' then -p.amount else p.amount end)
                 from public.payments p where p.subscription_id = new.id), 0) <> 0 then
    raise exception 'has_payments: subscription %', new.id using errcode = '23514';
  end if;
  if exists (select 1 from public.schedule_rules r where r.subscription_id = new.id and r.status = 'active')
     or exists (select 1 from public.lessons l join public.schedule_rules r on r.id = l.rule_id
                 where r.subscription_id = new.id
                   and l.status not in ('cancelled_by_teacher', 'cancelled_by_admin'))
     -- Lessons the package used FIFO (v_subscription_balance), on any rule: admin bookings, makeups and
     -- imported rules carry no subscription_id. The row is not cancelled yet, so the view still has it.
     -- Future lessons merely projected into it do not block: they move to the next package.
     or exists (select 1 from public.v_subscription_balance b
                 where b.subscription_id = new.id and b.lessons_used > 0) then
    raise exception 'has_lessons: subscription %', new.id using errcode = '23514';
  end if;
  -- A later priced package already earned its commission as a 'renewal' because of this one: cancelling
  -- would leave it a renewal and 'first' never earned (re-kinding is out of scope).
  if new.price > 0 and exists (
       select 1 from public.subscriptions o
       join public.assistant_commissions c on c.subscription_id = o.id
       where o.student_id = new.student_id and o.id <> new.id and o.price > 0 and o.status <> 'cancelled'
         and (o.created_at, o.id) > (new.created_at, new.id)) then
    raise exception 'has_commission: subscription %', new.id using errcode = '23514';
  end if;
  return new;
end $$;
revoke all on function public.subscription_cancel_guard() from public, anon, authenticated;

drop trigger if exists subscriptions_cancel_guard on public.subscriptions;
create trigger subscriptions_cancel_guard before update of status on public.subscriptions
  for each row when (new.status = 'cancelled' and old.status is distinct from 'cancelled')
  execute function public.subscription_cancel_guard();

-- 3. A cancelled package stays cancelled (never resurrected by a pause, a resume or a recompute), and its
--    money is frozen: no payment row of it may change or go (it stays net 0, never owed, never a commission).
create or replace function public.subscription_stays_cancelled() returns trigger
  language plpgsql set search_path = '' as $$
begin
  raise exception 'already_cancelled: subscription %', old.id using errcode = '23514';
end $$;
revoke all on function public.subscription_stays_cancelled() from public, anon, authenticated;

drop trigger if exists subscriptions_stay_cancelled on public.subscriptions;
create trigger subscriptions_stay_cancelled before update of status on public.subscriptions
  for each row when (old.status = 'cancelled' and new.status is distinct from 'cancelled')
  execute function public.subscription_stays_cancelled();

create or replace function public.payments_frozen_when_cancelled() returns trigger
  language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.subscriptions s where s.id = old.subscription_id and s.status = 'cancelled') then
    raise exception 'subscription % is cancelled', old.subscription_id using errcode = '23514';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
revoke all on function public.payments_frozen_when_cancelled() from public, anon, authenticated;

drop trigger if exists payments_frozen_when_cancelled on public.payments;
create trigger payments_frozen_when_cancelled before update or delete on public.payments
  for each row execute function public.payments_frozen_when_cancelled();
