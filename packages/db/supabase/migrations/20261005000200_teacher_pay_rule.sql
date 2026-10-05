-- ONE rule for which lessons count toward teacher pay (owner, 2026-10-05: "payments, teacher payments
-- and expenses need to be re-managed"). Before this, the monthly payout and the dashboard counted
-- trials and lessons of students who left, while the per-session ledger (view of migration 183) hid
-- trials AND every lesson whose student is not active TODAY, so a teacher's history shrank whenever a
-- student churned. Now:
--
--   public.lesson_counts_for_pay(status, rule_id)  -- THE rule, decided from the lesson alone:
--     * status completed; late / no_show only when settings payout_count_late / payout_count_no_show;
--     * a trial lesson (its rule's package = 'trial') only when the new setting payout_count_trials
--       (default false = what the ledger did until now);
--     * never students.status: the lesson's own facts are frozen history.
--   public.teacher_rate_for(minutes, rate_30, rate_45, rate_60, rate_90)  -- THE price (R-PAY-02):
--     * 30/45/60/90 minutes → that rate (null when the teacher has none: the admin sets it);
--     * any other length → pro-rated per minute from the NEAREST length the teacher has a rate for
--       (ties go to the longer length), rounded to 2 decimals. 50 min with rate_45 = 70 → 77.78.
--   sync_teacher_earning (177) uses both, so teacher_session_earnings IS the truth;
--   v_teacher_payable_lessons  -- every counted lesson (+ any session already paid), with its earning
--     (null amount = no rate): read by the monthly payout and the dashboard's teacher cost;
--   v_teacher_countable_earnings (183, same columns) -- the ledger rows of those lessons: balances,
--     session lists, allocation; settle_payout_in_ledger pays from it too (migration 201).
-- A session with any paid_amount always counts (money out stays visible).
-- Unit twins: lessonCountsForPay / teacherRateFor in @ab/shared. SQL spec: e2e/tests/pay-rule.sql.spec.ts.

insert into public.settings (key, value) values ('payout_count_trials', 'false'::jsonb)
on conflict (key) do nothing;

alter table public.teacher_session_earnings drop constraint if exists teacher_session_earnings_minutes_check;
alter table public.teacher_session_earnings add constraint teacher_session_earnings_minutes_check
  check (minutes > 0);

create function public.lesson_counts_for_pay(p_status public.lesson_status, p_rule uuid)
  returns boolean language sql stable set search_path = '' as $$
  with s as (
    select coalesce(bool_or(key = 'payout_count_late' and value = 'true'::jsonb), false) as late,
           coalesce(bool_or(key = 'payout_count_no_show' and value = 'true'::jsonb), false) as no_show,
           coalesce(bool_or(key = 'payout_count_trials' and value = 'true'::jsonb), false) as trials
    from public.settings
    where key in ('payout_count_late', 'payout_count_no_show', 'payout_count_trials')
  )
  select (p_status = 'completed' or (p_status = 'late' and s.late) or (p_status = 'no_show' and s.no_show))
     and (s.trials or not exists (select 1 from public.schedule_rules r
                                  where r.id = p_rule and r.package = 'trial'))
  from s
$$;

create function public.teacher_rate_for(p_minutes int, r30 numeric, r45 numeric, r60 numeric, r90 numeric)
  returns numeric language sql immutable set search_path = '' as $$
  select case
    when p_minutes in (30, 45, 60, 90) then
      case p_minutes when 30 then r30 when 45 then r45 when 60 then r60 else r90 end
    else (select round(x.rate * p_minutes / x.slot, 2)
          from (values (30, r30), (45, r45), (60, r60), (90, r90)) x (slot, rate)
          where x.rate is not null and p_minutes > 0
          order by abs(x.slot - p_minutes), x.slot desc
          limit 1)
  end
$$;

create or replace function public.sync_teacher_earning(p_lesson uuid) returns void
  language plpgsql security definer set search_path = '' as $$
declare
  l record;
  e record;
  v_minutes int;
  v_rate numeric;
begin
  select id, teacher_id, status, starts_at, ends_at, rule_id into l from public.lessons where id = p_lesson;
  if not found then
    return; -- deleted: its unpaid earning went with it (on delete cascade)
  end if;
  select * into e from public.teacher_session_earnings where lesson_id = p_lesson for update;

  v_minutes := round(extract(epoch from (l.ends_at - l.starts_at)) / 60)::int;
  if public.lesson_counts_for_pay(l.status, l.rule_id) and v_minutes > 0 then
    if e.id is not null and e.minutes = v_minutes and e.teacher_id = l.teacher_id then
      v_rate := e.rate;
    else
      select public.teacher_rate_for(v_minutes, t.rate_30, t.rate_45, t.rate_60, t.rate_90)
        into v_rate from public.teachers t where t.id = l.teacher_id;
    end if;
  end if;

  if v_rate is not null then
    if e.id is null then
      insert into public.teacher_session_earnings (lesson_id, teacher_id, starts_at, minutes, rate, amount)
      values (l.id, l.teacher_id, l.starts_at, v_minutes, v_rate, v_rate);
    elsif e.status <> 'paid' then
      update public.teacher_session_earnings
         set teacher_id = l.teacher_id, starts_at = l.starts_at, minutes = v_minutes,
             rate = v_rate, amount = v_rate, status = public.earning_status(e.paid_amount, v_rate)
       where id = e.id;
    end if;
  elsif e.id is not null then
    if e.paid_amount = 0 then
      delete from public.teacher_session_earnings where id = e.id;
    elsif e.status <> 'paid' or e.amount <> e.paid_amount then
      update public.teacher_session_earnings set amount = e.paid_amount, status = 'paid' where id = e.id;
    end if;
  end if;
end $$;

create view public.v_teacher_payable_lessons with (security_invoker = true) as
select l.id as lesson_id,
       coalesce(e.teacher_id, l.teacher_id) as teacher_id,
       coalesce(e.starts_at, l.starts_at) as starts_at,
       coalesce(e.minutes, round(extract(epoch from (l.ends_at - l.starts_at)) / 60)::int) as minutes,
       l.status,
       (r.package is not null and r.package = 'trial') as is_trial,
       e.id as earning_id, e.rate, e.amount, coalesce(e.paid_amount, 0) as paid_amount
from public.lessons l
left join public.schedule_rules r on r.id = l.rule_id
left join public.teacher_session_earnings e on e.lesson_id = l.id
where (l.status in ('completed', 'late', 'no_show') and public.lesson_counts_for_pay(l.status, l.rule_id))
   or e.paid_amount > 0;

create or replace view public.v_teacher_countable_earnings with (security_invoker = true) as
select e.id, e.lesson_id, e.teacher_id, e.starts_at, e.minutes, e.rate, e.amount, e.paid_amount,
       e.currency, e.status, e.created_at, e.updated_at
from public.teacher_session_earnings e
join public.lessons l on l.id = e.lesson_id
where e.paid_amount > 0 or public.lesson_counts_for_pay(l.status, l.rule_id);

revoke all on public.v_teacher_payable_lessons from anon;
revoke insert, update, delete, truncate, references, trigger on public.v_teacher_payable_lessons
  from authenticated;
revoke execute on function public.lesson_counts_for_pay(public.lesson_status, uuid),
  public.teacher_rate_for(int, numeric, numeric, numeric, numeric) from public, anon;
grant execute on function public.lesson_counts_for_pay(public.lesson_status, uuid),
  public.teacher_rate_for(int, numeric, numeric, numeric, numeric) to authenticated, service_role;

-- Re-judge every lesson with the one rule: unpaid trial earnings go (setting off), odd lengths get
-- a pro-rated earning. Idempotent.
select public.resync_teacher_earnings(null);
