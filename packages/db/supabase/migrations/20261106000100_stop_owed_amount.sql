-- The stop sheet's money choice (owner 2026-11-06: «for the refund make me choose what I need»). A STOPPED course
-- owes what the person stopping it chose, stored on the package so a later settings change never rewrites it:
--   subscriptions.stop_owed_amount: what the stopped course is owed for (receivables, the lists, the payment forms,
--     the assistant's history read owedFor = this when stopped, else the price; due = max(0, owed − net paid)).
--     «إلغاء فقط»: attended × rate (default), the price, 0 or a custom amount 0..price. «إلغاء مع استرداد»: the net
--     paid after the refund, so nothing more is owed.
--   subscriptions.stop_owed_choice: the option chosen (who and when are the stop's cancelled_by / cancelled_at, and
--     the stop's audit row carries both values too).
-- stop_course v2 (991's body) writes both in the stop's ONE transaction from p.owed_amount / p.owed_choice; a caller
-- without owed_amount (SQL, the old API still running during the deploy) leaves both NULL: owedFor falls back to the
-- price, and the backfill below (idempotent: a re-run of this file) settles them by the same rule as older stops.
-- BACKFILL: every existing stop keeps the behaviour from before PR #623 (owes its price), so no debt changes on
-- deploy; a stop already followed by a refund row (a «إلغاء مع استرداد» made since #623) owes the net paid after
-- it (nothing more), never the refunded amount (second precision: a Stripe refund row's paid_at is cut to whole
-- seconds). A stop whose Stripe refund is still pending at deploy (no row yet) keeps the price: check those by hand.
-- A retry of the same stop with another decision is 409 stop_mismatch (the stored one stays). RLS unchanged: the table's policies cover the columns; only the
-- service role writes them (through stop_course).
-- SQL test plan: e2e/tests/teaching/course-stop-owed.sql.spec.ts.
-- Rollback: re-run 991's stop_course; drop columns subscriptions.stop_owed_amount, stop_owed_choice. Idempotent.
set local lock_timeout = '5s';

alter table public.subscriptions add column if not exists stop_owed_amount numeric(12, 2);
alter table public.subscriptions add column if not exists stop_owed_choice text;
alter table public.subscriptions drop constraint if exists subscriptions_stop_owed_check;
alter table public.subscriptions add constraint subscriptions_stop_owed_check check (
  (stop_owed_amount is null or stop_owed_amount >= 0)
  and (stop_owed_choice is null or stop_owed_choice in
       ('attended', 'price', 'nothing', 'custom', 'refund_unattended', 'refund_paid', 'refund_custom', 'legacy'))
);
comment on column public.subscriptions.stop_owed_amount is
  'What a STOPPED course is owed for (owedFor): chosen in the stop sheet, written by stop_course; null unless stopped.';
comment on column public.subscriptions.stop_owed_choice is
  'The stop sheet option behind stop_owed_amount; legacy = a stop made before 20261106000100 (backfilled).';

-- Backfill (only rows with nothing stored, so a re-run changes nothing).
update public.subscriptions s
   set stop_owed_choice = 'legacy',
       stop_owed_amount = case
         when exists (select 1 from public.payments r
                       where r.subscription_id = s.id and r.kind = 'refund'
                         and r.paid_at >= date_trunc('second', s.cancelled_at))
         then greatest(0, coalesce((select sum(case when p.kind = 'refund' then -p.amount else p.amount end)
                                      from public.payments p where p.subscription_id = s.id), 0))
         else s.price end
 where s.cancel_kind = 'stopped' and s.stop_owed_amount is null;

-- stop_course v2: 991's body plus the owed amount and choice (stamp and audit).
create or replace function public.stop_course(p jsonb) returns jsonb
  language plpgsql set search_path = '' as $$
declare
  v_sub uuid := (p ->> 'subscription_id')::uuid;
  v_request uuid := (p ->> 'client_request_id')::uuid;
  v_actor uuid := (p ->> 'actor')::uuid;
  v_reason text := btrim(p ->> 'reason');
  v_owed numeric(12, 2) := (p ->> 'owed_amount')::numeric;
  v_choice text := p ->> 'owed_choice';
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
  if v_owed < 0 then
    raise exception 'stop_course: owed_amount below 0' using errcode = '22023';
  end if;
  select * into s from public.subscriptions where id = v_sub for update;
  if s.id is null or s.student_id is distinct from (p ->> 'student_id')::uuid then
    raise exception 'subscription_not_found' using errcode = 'P0001';
  end if;
  if s.status = 'cancelled' then
    if s.stop_request_id is distinct from v_request then
      raise exception 'already_cancelled' using errcode = 'P0001';
    end if;
    -- A retry of the same stop asking another money decision (the sheet changed after an error) is refused:
    -- the stored decision stays the first one, so a refund or owe must never run against it.
    if v_owed is not null and coalesce(s.stop_owed_choice, 'legacy') <> 'legacy'
       and (s.stop_owed_amount is distinct from v_owed or s.stop_owed_choice is distinct from coalesce(v_choice, 'price')) then
      raise exception 'stop_mismatch' using errcode = 'P0001';
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
         cancel_reason = v_reason, stop_request_id = v_request, lessons_used_at_stop = coalesce(v_used, lessons_used_before),
         stop_owed_amount = v_owed,
         stop_owed_choice = case when v_owed is null then null else coalesce(v_choice, 'price') end
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
    'ended_rules', to_jsonb(v_rules), 'student_status', v_to, 'closed_pause', v_pause,
    'owed_amount', v_owed, 'owed_choice', case when v_owed is null then null else coalesce(v_choice, 'price') end);
  perform public.course_pause_audit(v_actor, 'subscriptions', v_sub, 'cancel', jsonb_build_object(
    'before', jsonb_build_object('status', s.status, 'cancelled_at', null), 'after', v_after));
  return v_after || jsonb_build_object('replayed', false, 'stopped_at', v_at);
end $$;
revoke execute on function public.stop_course(jsonb) from public, anon, authenticated;
grant execute on function public.stop_course(jsonb) to service_role;
