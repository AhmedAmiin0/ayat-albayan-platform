-- «إلغاء الاشتراك» review fixes (PR #464, owner 2026-10-30: STOP THE COURSE, KEEP THE MONEY).
-- A stop keeps subscriptions.status = 'cancelled' with cancel_kind = 'stopped' (990), so every guard that keeps a
-- cancelled package closed (no new rule, never resurrected) still holds. What changes:
--   1. Money readers. 934 made every reader skip a cancelled package (a mistake, nothing on it). A STOPPED one
--      keeps its money: the readers now skip only cancellations that are not stops
--      (status <> 'cancelled' or cancel_kind = 'stopped'): v_package_lessons / v_subscription_balance (the held
--      lessons stay on the stopped package, never re-counted on the next one), subscription_full_at (its
--      earned commission is never voided by settle_assistant_commission), subscription_commission_kind (it
--      stays 'first' / 'renewal'; 'first' never moves to a later package), the unused-cancel guard's
--      has_commission. A stopped package's FIFO capacity freezes at the stop (subscriptions.lessons_used_at_stop):
--      it keeps the lessons it used and the next package's lessons never land on it; remaining still reads
--      lessons_total - used (the unused lessons are forfeited, not carried over). Payments of a stopped package
--      stay writable (the family may still settle what it owes: receivables list it); an unused-cancelled
--      package's stay frozen.
--   2. course_rules_of(subscription): the course's rules. schedule_rules.subscription_id is null for imported,
--      calendar-handover and admin-booked rules (470), so a rule with no subscription_id is the course's when
--      the student is on it and it runs inside the package's period [starts_on, the next package's starts_on).
--      clean = false when such a rule cannot be attributed: another student is on it (a group), or it runs
--      past the next package's start. from_on / until_on bound its lessons to the period.
--   3. stop_course(p): the whole stop in ONE transaction, replayed by client_request_id: subscriptions.
--      stop_request_id is written with the stamp. It ends the course's rules (active or paused) on the stop
--      day in their zone, cancels its open lessons from now (cancelled_by_admin, not chargeable), closes the
--      student's open course pause (extended_days 0: nothing moves), stamps the package and moves the student
--      to «توقف» unless another package still runs. Never a message. 409 codes (P0001): already_cancelled,
--      course_unattributed, subscription_not_found.
--   4. change_course v2: the course is course_rules_of's (the old rules of a student without subscription_id
--      end and move too); 409 course_unattributed for an active rule it cannot attribute.
-- SQL test plan: e2e/tests/teaching/course-stop.sql.spec.ts (commission, balance, receivables, terms unchanged
--   by a stop; imported rules ended; replay; group rule → course_unattributed; pause closed; no churn while
--   another package runs).
-- Rollback: re-run 934's views and functions, 990's guard, 480's change_course; drop course_stop_plan,
--   stop_course, course_rules_of; drop columns subscriptions.stop_request_id, lessons_used_at_stop. Idempotent.
set local lock_timeout = '5s';

alter table public.subscriptions add column if not exists stop_request_id uuid;
create unique index if not exists subscriptions_stop_request_idx on public.subscriptions (stop_request_id)
  where stop_request_id is not null;
comment on column public.subscriptions.stop_request_id is
  'The clientRequestId of the «إلغاء الاشتراك» that stopped this package (written with the stamp; replay key).';
alter table public.subscriptions add column if not exists lessons_used_at_stop int;
comment on column public.subscriptions.lessons_used_at_stop is
  'v_subscription_balance.lessons_used when «إلغاء الاشتراك» stopped this package (capped at lessons_total): its FIFO capacity from then on.';

-- 1. Money readers: same bodies as 934, «not cancelled» → «not cancelled unless stopped».
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

create or replace function public.subscription_full_at(p_subscription uuid) returns timestamptz
  language sql stable set search_path = '' as $$
  with price as (
    select s.price from public.subscriptions s
     where s.id = p_subscription and (s.status <> 'cancelled' or s.cancel_kind = 'stopped')
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

create or replace function public.subscription_commission_kind(p_subscription uuid) returns text
  language sql stable set search_path = '' as $$
  select case when s.price > 0 and (s.status <> 'cancelled' or s.cancel_kind = 'stopped') then
           case when exists (select 1 from public.subscriptions o
                              where o.student_id = s.student_id and o.price > 0 and o.id <> s.id
                                and (o.status <> 'cancelled' or o.cancel_kind = 'stopped')
                                and (o.created_at, o.id) < (s.created_at, s.id))
                then 'renewal' else 'first' end
         end
  from public.subscriptions s where s.id = p_subscription
$$;

-- Payments: a stopped package keeps taking and correcting them; schedule rules never point at it.
create or replace function public.refuse_cancelled_subscription() returns trigger
  language plpgsql set search_path = '' as $$
declare
  v_status public.subscription_status;
  v_kind text;
begin
  if new.subscription_id is null then
    return new;
  end if;
  select s.status, s.cancel_kind into v_status, v_kind
    from public.subscriptions s where s.id = new.subscription_id for share;
  if v_status = 'cancelled' and (tg_table_name <> 'payments' or v_kind is distinct from 'stopped') then
    raise exception 'subscription % is cancelled', new.subscription_id using errcode = '23514';
  end if;
  return new;
end $$;
revoke all on function public.refuse_cancelled_subscription() from public, anon, authenticated;

create or replace function public.payments_frozen_when_cancelled() returns trigger
  language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.subscriptions s where s.id = old.subscription_id and s.status = 'cancelled'
                and s.cancel_kind is distinct from 'stopped') then
    raise exception 'subscription % is cancelled', old.subscription_id using errcode = '23514';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
revoke all on function public.payments_frozen_when_cancelled() from public, anon, authenticated;

-- 2. The course's rules (any status). linked: subscription_id is the package's. Unlinked rules are bounded
--    to the package's period; their lessons count for it only inside [from_on, until_on).
create or replace function public.course_rules_of(p_subscription uuid)
  returns table (rule_id uuid, linked boolean, clean boolean, from_on date, until_on date)
  language sql stable set search_path = '' as $$
  with s as (
    select s.id, s.student_id, s.starts_on, s.created_at from public.subscriptions s where s.id = p_subscription
  ), nxt as (
    select (select min(o.starts_on) from public.subscriptions o
             where o.student_id = s.student_id and o.id <> s.id
               and (o.status <> 'cancelled' or o.cancel_kind = 'stopped')
               and (o.starts_on, o.created_at, o.id) > (s.starts_on, s.created_at, s.id)) as starts_on
    from s
  )
  select r.id, true, true, null::date, null::date
    from public.schedule_rules r, s where r.subscription_id = s.id
  union all
  select r.id, false,
         (select count(*) from public.schedule_rule_students o where o.rule_id = r.id) = 1
           and (nxt.starts_on is null or (r.ends_on is not null and r.ends_on < nxt.starts_on)),
         s.starts_on, nxt.starts_on
    from s cross join nxt
    join public.schedule_rule_students rs on rs.student_id = s.student_id
    join public.schedule_rules r on r.id = rs.rule_id
   where r.subscription_id is null
     and r.package is distinct from 'trial'
     and (nxt.starts_on is null or r.starts_on < nxt.starts_on)
     and (r.ends_on is null or r.ends_on >= s.starts_on)
$$;
revoke execute on function public.course_rules_of(uuid) from public, anon, authenticated;
grant execute on function public.course_rules_of(uuid) to service_role;

-- What a stop at p_at takes: the rules still running (active or paused, not ended before the stop day in
-- their zone), the student's open lessons of the course from p_at, and whether any of them cannot be
-- attributed (a group rule or lesson, a rule running into the next package).
create or replace function public.course_stop_plan(p_subscription uuid, p_at timestamptz) returns jsonb
  language sql stable set search_path = '' as $$
  with s as (select s.id, s.student_id from public.subscriptions s where s.id = p_subscription),
  c as (select * from public.course_rules_of(p_subscription)),
  running as (
    select r.id, c.clean from c join public.schedule_rules r on r.id = c.rule_id
     where r.status in ('active', 'paused') and (r.ends_on is null or r.ends_on >= (p_at at time zone r.tz)::date)
  ), open as (
    select l.id, l.status,
           c.clean and not exists (select 1 from public.lesson_students o
                                    where o.lesson_id = l.id and o.student_id <> s.student_id) as clean
      from c cross join s
      join public.lessons l on l.rule_id = c.rule_id
      join public.lesson_students ls on ls.lesson_id = l.id and ls.student_id = s.student_id
     where l.status in ('scheduled', 'confirmed') and l.starts_at >= p_at
       and (c.from_on is null or l.local_date >= c.from_on)
       and (c.until_on is null or l.local_date < c.until_on)
  )
  select jsonb_build_object(
    'rule_ids', coalesce((select jsonb_agg(id order by id) from running), '[]'::jsonb),
    'lessons', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'status', status) order by id) from open),
                        '[]'::jsonb),
    'unattributed', exists (select 1 from running where not clean) or exists (select 1 from open where not clean))
$$;
revoke execute on function public.course_stop_plan(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.course_stop_plan(uuid, timestamptz) to service_role;

-- 990's guard, with its stopped branch on course_rules_of (a rule without subscription_id counts) and
-- has_commission counting stopped packages.
create or replace function public.subscription_cancel_guard() returns trigger
  language plpgsql set search_path = '' as $$
begin
  perform 1 from public.subscriptions s where s.id = new.id for update;
  if new.cancel_kind = 'stopped' then
    if coalesce(btrim(new.cancel_reason), '') = '' then
      raise exception 'reason_required: subscription %', new.id using errcode = '23514';
    end if;
    if jsonb_array_length(public.course_stop_plan(new.id, now()) -> 'lessons') > 0 then
      raise exception 'has_future_lessons: subscription %', new.id using errcode = '23514';
    end if;
    return new;
  end if;
  if coalesce((select sum(case when p.kind = 'refund' then -p.amount else p.amount end)
                 from public.payments p where p.subscription_id = new.id), 0) <> 0 then
    raise exception 'has_payments: subscription %', new.id using errcode = '23514';
  end if;
  if exists (select 1 from public.schedule_rules r where r.subscription_id = new.id and r.status = 'active')
     or exists (select 1 from public.lessons l join public.schedule_rules r on r.id = l.rule_id
                 where r.subscription_id = new.id
                   and l.status not in ('cancelled_by_teacher', 'cancelled_by_admin'))
     or exists (select 1 from public.v_subscription_balance b
                 where b.subscription_id = new.id and b.lessons_used > 0) then
    raise exception 'has_lessons: subscription %', new.id using errcode = '23514';
  end if;
  if new.price > 0 and exists (
       select 1 from public.subscriptions o
       join public.assistant_commissions c on c.subscription_id = o.id
       where o.student_id = new.student_id and o.id <> new.id and o.price > 0
         and (o.status <> 'cancelled' or o.cancel_kind = 'stopped')
         and (o.created_at, o.id) > (new.created_at, new.id)) then
    raise exception 'has_commission: subscription %', new.id using errcode = '23514';
  end if;
  return new;
end $$;
revoke all on function public.subscription_cancel_guard() from public, anon, authenticated;

-- 3. The stop, one transaction. p: subscription_id, student_id, client_request_id, actor, reason.
--    Lock order: the package, the student's open pause, the rules (by id), as the pause RPCs.
create or replace function public.stop_course(p jsonb) returns jsonb
  language plpgsql set search_path = '' as $$
declare
  v_sub uuid := (p ->> 'subscription_id')::uuid;
  v_request uuid := (p ->> 'client_request_id')::uuid;
  v_actor uuid := (p ->> 'actor')::uuid;
  v_reason text := btrim(p ->> 'reason');
  v_at timestamptz := now();
  s public.subscriptions;
  v_plan jsonb;
  v_rules uuid[];
  v_pause uuid;
  v_from public.student_status;
  v_to public.student_status;
  v_after jsonb;
  v_used int;
begin
  if v_sub is null or v_request is null or v_actor is null or coalesce(v_reason, '') = '' then
    raise exception 'stop_course needs subscription_id, client_request_id, actor and reason' using errcode = '22023';
  end if;
  select * into s from public.subscriptions where id = v_sub for update;
  if s.id is null or s.student_id is distinct from (p ->> 'student_id')::uuid then
    raise exception 'subscription_not_found' using errcode = 'P0001';
  end if;
  if s.status = 'cancelled' then
    if s.stop_request_id is distinct from v_request then
      raise exception 'already_cancelled' using errcode = 'P0001';
    end if;
    select a.after into v_after from public.audit_log a
     where a.entity = 'subscriptions' and a.entity_id = v_sub and a.action = 'cancel'
       and a.after ->> 'client_request_id' = v_request::text
     order by a.at desc limit 1;
    return v_after || jsonb_build_object('replayed', true, 'stopped_at', s.cancelled_at);
  end if;
  select cp.id into v_pause from public.course_pauses cp
   where cp.student_id = s.student_id and cp.resumed_at is null for update;
  v_plan := public.course_stop_plan(v_sub, v_at);
  select coalesce(array_agg(x::uuid order by x), '{}') into v_rules
    from jsonb_array_elements_text(v_plan -> 'rule_ids') x;
  perform 1 from public.schedule_rules r where r.id = any(v_rules) order by r.id for update;
  v_plan := public.course_stop_plan(v_sub, v_at); -- again under the locks
  if (v_plan ->> 'unattributed')::boolean then
    raise exception 'course_unattributed' using errcode = 'P0001';
  end if;

  update public.schedule_rules r
     set status = 'ended',
         ends_on = greatest(r.starts_on, least(coalesce(r.ends_on, (v_at at time zone r.tz)::date),
                                               (v_at at time zone r.tz)::date))
   where r.id = any(v_rules);
  perform public.apply_lesson_changes(jsonb_build_object('actor', v_actor, 'changes', (
    select coalesce(jsonb_agg(jsonb_build_object('id', l ->> 'id', 'from_status', l ->> 'status',
             'to_status', 'cancelled_by_admin', 'cancel_reason', v_reason, 'chargeable', false)), '[]'::jsonb)
      from jsonb_array_elements(v_plan -> 'lessons') l)));
  if v_pause is not null then
    update public.course_pauses set resumed_at = v_at, resumed_by = v_actor, extended_days = 0 where id = v_pause;
    perform public.course_pause_audit(v_actor, 'course_pauses', v_pause, 'resume', jsonb_build_object(
      'after', jsonb_build_object('via', 'course_stop', 'days', 0, 'subscription_id', v_sub)));
  end if;

  -- The FIFO capacity freezes at what it used (under the package lock; an overrun stays the next one's).
  select least(b.lessons_used, s.lessons_total) into v_used
    from public.v_subscription_balance b where b.subscription_id = v_sub;
  update public.subscriptions
     set status = 'cancelled', cancel_kind = 'stopped', cancelled_at = v_at, cancelled_by = v_actor,
         cancel_reason = v_reason, stop_request_id = v_request, lessons_used_at_stop = coalesce(v_used, lessons_used_before)
   where id = v_sub;

  -- «توقف» unless another package still runs (a later one, or an active one).
  select st.status into v_from from public.students st where st.id = s.student_id for update;
  v_to := v_from;
  if v_from <> 'churned' and not exists (
       select 1 from public.subscriptions o
        where o.student_id = s.student_id and o.id <> v_sub and o.status <> 'cancelled'
          and (o.status = 'active' or (o.starts_on, o.created_at, o.id) > (s.starts_on, s.created_at, s.id))) then
    v_to := 'churned';
    update public.students set status = v_to where id = s.student_id;
    perform public.course_pause_audit(v_actor, 'students', s.student_id, 'status_change', jsonb_build_object(
      'before', jsonb_build_object('status', v_from),
      'after', jsonb_build_object('status', v_to, 'from', v_from, 'reason', 'subscription_stopped',
                                  'subscription_id', v_sub)));
  end if;

  insert into public.audit_log (actor_id, entity, entity_id, action, before, after)
  select v_actor, 'schedule_rules', r, 'cancel', null,
         jsonb_build_object('via', 'course_stop', 'subscription_id', v_sub, 'reason', v_reason)
    from unnest(v_rules) r;
  v_after := jsonb_build_object(
    'status', 'cancelled', 'kind', 'stopped', 'reason', v_reason, 'client_request_id', v_request,
    'cancelled_lessons', (select coalesce(jsonb_agg(l -> 'id'), '[]'::jsonb) from jsonb_array_elements(v_plan -> 'lessons') l),
    'ended_rules', to_jsonb(v_rules), 'student_status', v_to, 'closed_pause', v_pause);
  perform public.course_pause_audit(v_actor, 'subscriptions', v_sub, 'cancel', jsonb_build_object(
    'before', jsonb_build_object('status', s.status, 'cancelled_at', null), 'after', v_after));
  return v_after || jsonb_build_object('replayed', false, 'stopped_at', v_at);
end $$;
revoke execute on function public.stop_course(jsonb) from public, anon, authenticated;
grant execute on function public.stop_course(jsonb) to service_role;

-- 4. change_course v2 (480): the course's rules are course_rules_of's, so a student whose old rules carry no
--    subscription_id changes too; an active rule it cannot attribute is 409 course_unattributed.
create or replace function public.change_course(p jsonb) returns jsonb
  language plpgsql set search_path = '' as $$
declare
  v_request uuid := (p ->> 'client_request_id')::uuid;
  v_sub uuid := (p ->> 'subscription_id')::uuid;
  v_actor jsonb := p -> 'actor';
  v_starts date := (p ->> 'starts_on')::date;
  v_course uuid[];
  v_ends date;
  v_first uuid;
  v_end jsonb;
  v_rule jsonb;
begin
  if v_request is null or v_sub is null or v_starts is null then
    raise exception 'change_course needs client_request_id, subscription_id and starts_on' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('change_course:' || v_sub::text, 0));
  select id into v_first from public.schedule_rules where client_request_id = v_request;
  if v_first is not null then
    return public.course_change_result(v_first);
  end if;
  if jsonb_array_length(coalesce(p -> 'new_rules', '[]'::jsonb)) = 0
     or jsonb_typeof(p -> 'audit') is distinct from 'object' then
    raise exception 'change_course needs new_rules and audit' using errcode = '22023';
  end if;
  if exists (select 1 from public.course_rules_of(v_sub) c join public.schedule_rules r on r.id = c.rule_id
              where not c.clean and r.status = 'active' and (r.ends_on is null or r.ends_on >= v_starts)) then
    raise exception 'course_unattributed' using errcode = 'P0001';
  end if;
  select coalesce(array_agg(c.rule_id), '{}') into v_course from public.course_rules_of(v_sub) c;
  if exists (select 1 from public.schedule_rules r
              where r.id = any(v_course) and r.status = 'active'
                and (r.ends_on is null or r.ends_on >= v_starts)
                and not exists (select 1 from jsonb_array_elements(coalesce(p -> 'end_rules', '[]'::jsonb)) e
                                 where (e ->> 'id')::uuid = r.id))
     or exists (select 1 from jsonb_array_elements(coalesce(p -> 'end_rules', '[]'::jsonb)) e
                  join public.schedule_rules r on r.id = (e ->> 'id')::uuid
                 where r.id = any(v_course) and r.status <> 'active') then
    raise exception 'course_changed' using errcode = 'P0001';
  end if;

  for v_end in select * from jsonb_array_elements(coalesce(p -> 'end_rules', '[]'::jsonb)) loop
    -- least() skips a null ends_on (an open-ended rule takes the requested day).
    select least(r.ends_on, (v_end ->> 'ends_on')::date) into v_ends
      from public.schedule_rules r
     where r.id = (v_end ->> 'id')::uuid and r.id = any(v_course);
    if not found then
      raise exception 'course_mismatch' using errcode = 'P0001';
    end if;
    perform public.apply_lesson_changes(jsonb_build_object(
      'actor', v_actor,
      'end_rule', jsonb_build_object('id', v_end -> 'id', 'ends_on', v_ends),
      'changes', coalesce(v_end -> 'changes', '[]'::jsonb)));
  end loop;
  if jsonb_array_length(coalesce(p -> 'changes', '[]'::jsonb)) > 0 then
    if exists (select 1 from jsonb_array_elements(p -> 'changes') c
                where not exists (select 1 from public.lessons l
                                   where l.id = (c ->> 'id')::uuid and l.rule_id = any(v_course))) then
      raise exception 'course_mismatch' using errcode = 'P0001';
    end if;
    perform public.apply_lesson_changes(jsonb_build_object('actor', v_actor, 'changes', p -> 'changes'));
  end if;

  for v_rule in select * from jsonb_array_elements(p -> 'new_rules') loop
    if (v_rule ->> 'subscription_id')::uuid is distinct from v_sub then
      raise exception 'course_mismatch' using errcode = 'P0001';
    end if;
    perform public.apply_lesson_changes(jsonb_build_object(
      'actor', v_actor,
      'new_rule', v_rule - 'lessons',
      'lessons', coalesce(v_rule -> 'lessons', '[]'::jsonb)));
    if v_first is null then
      v_first := (v_rule ->> 'id')::uuid;
      update public.schedule_rules set client_request_id = v_request where id = v_first;
    end if;
  end loop;

  perform public.apply_lesson_changes(jsonb_build_object(
    'actor', v_actor,
    'messages', coalesce(p -> 'messages', '[]'::jsonb),
    'audit', p -> 'audit'));
  return public.course_change_result(v_first);
end $$;
revoke execute on function public.change_course(jsonb) from public, anon, authenticated;
grant execute on function public.change_course(jsonb) to service_role;
