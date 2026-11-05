-- A stop or a stop's refund never voids the assistant's commission (owner 2026-11-06: «its not related to the
-- assistant»; migration 991: «a stopped package's earned commission is never voided»). Until now a «إلغاء مع استرداد»
-- wrote a refund row, subscription_full_at went null and settle_assistant_commission voided the earned row
-- ('payment_voided'). Now an EARNED row on a STOPPED package (cancel_kind 'stopped') is kept as it is: never voided,
-- reduced or reversed by a refund on it. Every other package settles exactly as before (751's body otherwise
-- unchanged): a refund on a running package still voids its unpaid commission.
-- Deploy: function bodies only; no row is evaluated, re-settled or changed (rows voided before this stay as they are;
-- an admin reinstates one by hand if wanted).
-- SQL test plan: e2e/tests/teaching/course-stop-owed.sql.spec.ts (stop refund keeps the commission; a refund on a
--   running package voids it as today).
-- Rollback: re-run 751's settle_assistant_commission; drop function subscription_stopped(uuid).
set local lock_timeout = '5s';

create or replace function public.subscription_stopped(p_subscription uuid) returns boolean
  language sql stable set search_path = '' as $$
  select exists (select 1 from public.subscriptions s
                  where s.id = p_subscription and s.status = 'cancelled' and s.cancel_kind = 'stopped')
$$;
revoke execute on function public.subscription_stopped(uuid) from public, anon, authenticated;
grant execute on function public.subscription_stopped(uuid) to service_role;

-- 751's settle_assistant_commission with the stopped branch in its first guard.
create or replace function public.settle_assistant_commission(p_kind text, p_row uuid, p_assistant uuid,
  p_brought timestamptz, p_candidate uuid, p_student uuid) returns uuid
  language plpgsql security definer set search_path = '' as $$
declare
  c record;
  p record;
  v_stmt uuid;
  v_id uuid;
begin
  -- The statement before the commission row (lock order: statement, then commission).
  select x.statement_id into v_stmt from public.assistant_commissions x where x.id = p_row;
  if v_stmt is not null then
    perform 1 from public.assistant_statements s where s.id = v_stmt for update;
  end if;
  select * into c from public.assistant_commissions x where x.id = p_row for update;
  if c.id is not null and c.status = 'earned' then
    if c.subscription_id is not null and (public.subscription_full_at(c.subscription_id) is not null
                                          or public.subscription_stopped(c.subscription_id)) then
      return c.id; -- fully paid, or a stopped package: earned stays earned (991, owner 2026-11-06)
    end if;
    perform public.void_assistant_commission_row(c.id, 'payment_voided', true, null);
    select * into c from public.assistant_commissions x where x.id = p_row;
  end if;
  if c.id is not null and not c.void_auto then
    return c.id; -- an admin voided it: it stays voided
  end if;
  if p_assistant is null or p_candidate is null then
    return null;
  end if;
  select * into p from public.assistant_commission_plan(p_assistant, p_brought, p_candidate, p_kind);
  if p.subscription_id is null then
    return null;
  end if;

  if c.id is null then
    insert into public.assistant_commissions (assistant_id, student_id, subscription_id, kind, share_percent,
        commission_type, rate, base_amount, base_currency, amount, currency, earned_at)
    values (p_assistant, p_student, p.subscription_id, p_kind, p.share_percent, p.commission_type, p.rate,
            p.base_amount, p.base_currency, p.amount, p.currency, p.full_at)
    returning id into v_id;
  elsif c.assistant_id = p_assistant and c.subscription_id = p.subscription_id and exists (
      select 1 from public.assistant_adjustments a
       where a.commission_id = c.id and a.kind = 'reversal' and a.statement_id is null) then
    -- The void is undone before its reversal reached a statement: the two cancel out, the row keeps what
    -- it was earned as (amount, share) and its line in the statement it is already in.
    delete from public.assistant_adjustments
     where commission_id = c.id and kind = 'reversal' and statement_id is null;
    update public.assistant_commissions
       set status = 'earned', voided_at = null, void_reason = null, void_auto = null
     where id = c.id;
    v_id := c.id;
  else
    -- Reinstated as a new earning of the CURRENT assistant at today's terms and share; its kind never flips.
    update public.assistant_commissions
       set assistant_id = p_assistant, subscription_id = p.subscription_id, commission_type = p.commission_type,
           rate = p.rate, base_amount = p.base_amount, base_currency = p.base_currency, amount = p.amount,
           currency = p.currency, share_percent = p.share_percent, earned_at = p.full_at, status = 'earned',
           voided_at = null, void_reason = null, void_auto = null, statement_id = null
     where id = c.id;
    v_id := c.id;
  end if;
  insert into public.audit_log (actor_id, entity, entity_id, action, after)
  values (null, 'assistant_commissions', v_id, case when c.id is null then 'earn' else 'reinstate' end,
          jsonb_build_object('assistant_id', p_assistant, 'student_id', p_student, 'subscription_id', p.subscription_id,
                             'kind', p_kind, 'share_percent', p.share_percent, 'amount', p.amount, 'currency', p.currency));
  return v_id;
end $$;

revoke execute on function public.settle_assistant_commission(text, uuid, uuid, timestamptz, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.settle_assistant_commission(text, uuid, uuid, timestamptz, uuid, uuid) to service_role;
