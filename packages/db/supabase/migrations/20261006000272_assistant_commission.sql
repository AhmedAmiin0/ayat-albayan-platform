-- Assistant commission logic (owner, 2026-10-06). Twin of @ab/shared sales/commission.ts
-- (computeCommission, firstPaidRule), whose tests pin the same rules.
--
--   * "Fully paid" is derived, never stored (subscriptions.status is recomputed by the API, a
--     part-paid package stays 'unpaid'): net paid (payments - refunds, in the package currency) >= price,
--     price > 0 (a free package brings nothing). It became fully paid at the paid_at of the payment
--     that LAST took it from below the price to the price (subscription_full_at).
--   * A student earns at most ONE commission: for the FIRST of their subscriptions to be fully paid
--     (by that date, then created_at, id), when the student has brought_by, the assistant has
--     commission terms, and that date (in the assistant's tz) is on or after commission_starts_on.
--     percent = value % of the subscription price in its own currency; fixed = value in its currency.
--   * evaluate_assistant_commission(subscription) runs after every payment insert / update / delete and
--     a price change (triggers below), so a recorded, edited, refunded or deleted payment all land here.
--     It is race-safe: one advisory lock per student, backed by unique (student_id) and (subscription_id).
--       earned, still fully paid        -> nothing
--       earned, no longer fully paid    -> voided ('payment_voided', void_auto) and, when another
--                                          subscription is now the first fully paid, earned on that one
--       voided by a payment change      -> reinstated when a subscription is fully paid again
--       voided by an admin (manual)     -> stays voided
--   * A void after the commission sits in an approved or paid statement leaves that statement alone and
--     records a negative adjustment for the next open month (assistant_next_open_month); inside a draft
--     it just drops out and the draft is rebuilt (build_assistant_statement, migration 273).
--   Error codes (P0001): commission_not_found, already_voided, reason_required.

-- The month (first day) the next statement that is still open falls in: this month in the assistant's
-- tz, or the month after their newest approved / paid statement, whichever is later.
create or replace function public.assistant_next_open_month(p_assistant uuid) returns date
  language sql stable set search_path = '' as $$
  select greatest(
    date_trunc('month', now() at time zone coalesce(
      (select p.tz from public.profiles p where p.id = p_assistant), 'Asia/Riyadh'))::date,
    coalesce((select (max(s.month) + interval '1 month')::date from public.assistant_statements s
              where s.assistant_id = p_assistant and s.status <> 'draft'), date '0001-01-01'))
$$;

create or replace function public.subscription_full_at(p_subscription uuid) returns timestamptz
  language sql stable set search_path = '' as $$
  with price as (
    select s.price from public.subscriptions s where s.id = p_subscription
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

-- When the student's first fully paid subscription became fully paid; null when none is (for the
-- "my students" list: is the first subscription paid?). A client session only gets an answer for the
-- students it may see: an admin, or the assistant who brought the student.
create or replace function public.student_first_paid_at(p_student uuid) returns timestamptz
  language sql stable security definer set search_path = '' as $$
  select case
    when not public.is_client_session() or public.is_admin()
         or exists (select 1 from public.students st where st.id = p_student and st.brought_by = auth.uid())
    then (select min(public.subscription_full_at(s.id)) from public.subscriptions s where s.student_id = p_student)
  end
$$;

-- Voids one commission (internal: the evaluator and void_assistant_commission). p_auto = a payment change.
create or replace function public.void_assistant_commission_row(p_commission uuid, p_reason text, p_auto boolean,
  p_actor uuid) returns void language plpgsql security definer set search_path = '' as $$
declare
  c record;
  st record;
begin
  select * into c from public.assistant_commissions where id = p_commission for update;
  if not found then
    raise exception 'commission_not_found' using errcode = 'P0001';
  end if;
  if c.status = 'voided' then
    raise exception 'already_voided' using errcode = 'P0001';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  select * into st from public.assistant_statements where id = c.statement_id;
  update public.assistant_commissions
     set status = 'voided', voided_at = now(), void_reason = p_reason, void_auto = p_auto,
         statement_id = case when st.status = 'draft' then null else statement_id end
   where id = p_commission;
  if found and st.id is not null then
    if st.status = 'draft' then
      perform public.build_assistant_statement(st.id);
    else
      insert into public.assistant_adjustments (assistant_id, commission_id, kind, amount, currency, reason,
                                                effective_month, created_by)
      values (c.assistant_id, c.id, 'reversal', -c.amount, c.currency, p_reason,
              public.assistant_next_open_month(c.assistant_id), p_actor);
    end if;
  end if;
  insert into public.audit_log (actor_id, entity, entity_id, action, before, after)
  values (p_actor, 'assistant_commissions', p_commission, 'void',
          jsonb_build_object('amount', c.amount, 'currency', c.currency, 'statement_id', c.statement_id),
          jsonb_build_object('reason', p_reason, 'auto', p_auto));
end $$;

create or replace function public.evaluate_assistant_commission(p_subscription uuid) returns uuid
  language plpgsql security definer set search_path = '' as $$
declare
  v_student uuid;
  v_assistant uuid;
  c record;
  v_sub record;
  v_at timestamptz;
  t record;
  v_tz text;
  v_amount numeric(12, 2);
  v_currency text;
  v_id uuid;
begin
  select s.student_id into v_student from public.subscriptions s where s.id = p_subscription;
  if v_student is null then
    return null;
  end if;
  select st.brought_by into v_assistant from public.students st where st.id = v_student;
  if v_assistant is null and not exists (select 1 from public.assistant_commissions x where x.student_id = v_student) then
    return null; -- nobody brought this student: the common case, nothing to lock
  end if;
  perform pg_advisory_xact_lock(hashtextextended('assistant_commission:' || v_student, 0));
  select st.brought_by into v_assistant from public.students st where st.id = v_student;

  select * into c from public.assistant_commissions where student_id = v_student for update;
  if found and c.status = 'earned' then
    if c.subscription_id is not null and public.subscription_full_at(c.subscription_id) is not null then
      return c.id;
    end if;
    perform public.void_assistant_commission_row(c.id, 'payment_voided', true, null);
    select * into c from public.assistant_commissions where id = c.id;
  end if;
  if found and not c.void_auto then
    return c.id; -- an admin voided it: it stays voided
  end if;
  if v_assistant is null then
    return null;
  end if;

  select s.id, s.price, s.currency, f.at into v_sub
  from public.subscriptions s
  cross join lateral (select public.subscription_full_at(s.id) as at) f
  where s.student_id = v_student and f.at is not null
  order by f.at, s.created_at, s.id limit 1;
  if v_sub.id is null then
    return null;
  end if;
  v_at := v_sub.at;

  select * into t from public.assistant_terms a
   where a.assistant_id = v_assistant and a.commission_type is not null;
  if not found then
    return null;
  end if;
  select p.tz into v_tz from public.profiles p where p.id = v_assistant;
  if (v_at at time zone coalesce(v_tz, 'Asia/Riyadh'))::date < t.commission_starts_on then
    return null; -- no retroactive commission
  end if;
  if t.commission_type = 'percent' then
    v_amount := round(v_sub.price * t.commission_value / 100, 2);
    v_currency := v_sub.currency;
  else
    v_amount := t.commission_value;
    v_currency := t.commission_currency;
  end if;
  if v_amount <= 0 then
    return null;
  end if;

  if c.id is null then
    insert into public.assistant_commissions (assistant_id, student_id, subscription_id, commission_type, rate,
        base_amount, base_currency, amount, currency, earned_at)
    values (v_assistant, v_student, v_sub.id, t.commission_type, t.commission_value, v_sub.price,
            v_sub.currency, v_amount, v_currency, v_at)
    returning id into v_id;
  elsif c.subscription_id = v_sub.id and exists (
      select 1 from public.assistant_adjustments a
       where a.commission_id = c.id and a.kind = 'reversal' and a.statement_id is null) then
    -- The void is undone before its reversal reached a statement: the two cancel out and the
    -- commission keeps its line in the statement it is already in.
    delete from public.assistant_adjustments
     where commission_id = c.id and kind = 'reversal' and statement_id is null;
    update public.assistant_commissions
       set status = 'earned', voided_at = null, void_reason = null, void_auto = null
     where id = c.id;
    v_id := c.id;
  else
    -- Reinstated as a new earning (a frozen reversal stays in its statement).
    update public.assistant_commissions
       set assistant_id = v_assistant, subscription_id = v_sub.id, commission_type = t.commission_type,
           rate = t.commission_value, base_amount = v_sub.price, base_currency = v_sub.currency,
           amount = v_amount, currency = v_currency, earned_at = v_at, status = 'earned', voided_at = null,
           void_reason = null, void_auto = null, statement_id = null
     where id = c.id;
    v_id := c.id;
  end if;
  insert into public.audit_log (actor_id, entity, entity_id, action, after)
  values (null, 'assistant_commissions', v_id, case when c.id is null then 'earn' else 'reinstate' end,
          jsonb_build_object('assistant_id', v_assistant, 'student_id', v_student, 'subscription_id', v_sub.id,
                             'amount', v_amount, 'currency', v_currency));
  return v_id;
end $$;

-- Admin: void a commission by hand (a wrong attribution, a deal that fell through). Stays voided.
create or replace function public.void_assistant_commission(p_commission uuid, p_actor uuid, p_reason text)
  returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform public.void_assistant_commission_row(p_commission, p_reason, false, p_actor);
  return jsonb_build_object('commission_id', p_commission);
end $$;

create or replace function public.payments_assistant_commission() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  if tg_op <> 'INSERT' and (tg_op = 'DELETE' or old.subscription_id <> new.subscription_id) then
    perform public.evaluate_assistant_commission(old.subscription_id);
  end if;
  if tg_op <> 'DELETE' then
    perform public.evaluate_assistant_commission(new.subscription_id);
  end if;
  return null;
end $$;

create or replace function public.subscriptions_assistant_commission() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  perform public.evaluate_assistant_commission(new.id);
  return null;
end $$;

drop trigger if exists payments_assistant_commission_trg on public.payments;
create trigger payments_assistant_commission_trg after insert or update or delete on public.payments
  for each row execute function public.payments_assistant_commission();
drop trigger if exists subscriptions_assistant_commission_trg on public.subscriptions;
create trigger subscriptions_assistant_commission_trg after update of price, student_id on public.subscriptions
  for each row when (old.price is distinct from new.price or old.student_id is distinct from new.student_id)
  execute function public.subscriptions_assistant_commission();

revoke execute on function public.assistant_next_open_month(uuid), public.subscription_full_at(uuid),
  public.void_assistant_commission_row(uuid, text, boolean, uuid), public.evaluate_assistant_commission(uuid),
  public.void_assistant_commission(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.assistant_next_open_month(uuid), public.subscription_full_at(uuid),
  public.void_assistant_commission_row(uuid, text, boolean, uuid), public.evaluate_assistant_commission(uuid),
  public.void_assistant_commission(uuid, uuid, text) to service_role;
revoke execute on function public.student_first_paid_at(uuid) from public, anon;
grant execute on function public.student_first_paid_at(uuid) to authenticated, service_role;
