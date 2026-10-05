-- Correcting money out to a teacher (owner, 2026-10-05). Each RPC is ONE transaction with its audit
-- row (Phase 2 invariant 6), service_role only. Error codes (P0001) are mapped by earnings.errors.ts.
--
--   void_teacher_payment(payment, actor, reason): a wrong transfer is voided, never deleted. Its
--     teacher_payment_items allocations are reversed (paid_amount and status of each session
--     recomputed, then the session is re-judged by sync_teacher_earning, so a session capped after
--     a correction disappears when nothing is paid on it any more). The payment stays in the
--     history (voided_at / voided_by / void_reason, shown struck through). A monthly payout's
--     settlement payment voided = that payout is no longer paid: it goes back to approved.
--     Errors: payment_not_found, already_voided.
--   pay_payout(payout, actor, p {paid_at, method, note, receipt_path}): marking a payout paid settles
--     the ledger (settle_payout_in_ledger) AND moves the payout to paid in the same transaction;
--     the transfer's details are kept on the payout and on its settlement payment. invalid_transition.
--   unpay_payout(payout, actor, reason): paid → approved (voids its settlement payment, if any).
--   reopen_payout(payout, actor): approved → draft (calculate again before approving). invalid_transition.
alter table public.teacher_payments
  add column voided_at timestamptz,
  add column voided_by uuid references auth.users (id),
  add column void_reason text,
  add constraint teacher_payments_void_check
    check (voided_at is null or (void_reason is not null and length(trim(void_reason)) > 0));
-- A payout can be paid, un-paid and paid again: only one LIVE settlement per payout.
drop index public.teacher_payments_payout_key;
create unique index teacher_payments_payout_key on public.teacher_payments (payout_id)
  where payout_id is not null and voided_at is null;
-- A stale draft is deleted by «احسب»; its voided settlement keeps the history, not the link.
alter table public.teacher_payments drop constraint teacher_payments_payout_id_fkey,
  add constraint teacher_payments_payout_id_fkey foreign key (payout_id)
    references public.teacher_payouts (id) on delete set null;
-- Only a voided payment's items can point at an unpaid session (a live item means paid_amount > 0),
-- so when the re-judged session is deleted its voided items go with it.
alter table public.teacher_payment_items drop constraint teacher_payment_items_earning_id_fkey,
  add constraint teacher_payment_items_earning_id_fkey foreign key (earning_id)
    references public.teacher_session_earnings (id) on delete cascade;

alter table public.teacher_payouts
  add column method public.payment_method,
  add column note text,
  add column receipt_path text;

-- The monthly payout pays from the same rows the ledger shows (migration 200), once per payout
-- (a voided settlement does not count), locking the sessions in id order.
create or replace function public.settle_payout_in_ledger(p_payout uuid, p_actor uuid, p_paid_at timestamptz)
  returns uuid language plpgsql set search_path = '' as $$
declare
  po record;
  v_payment uuid;
  v_total numeric;
  v_ids uuid[];
begin
  select * into po from public.teacher_payouts where id = p_payout;
  if not found then
    raise exception 'payout_not_found' using errcode = 'P0001';
  end if;
  select id into v_payment from public.teacher_payments where payout_id = p_payout and voided_at is null;
  if found then
    return v_payment;
  end if;
  select array_agg(e.id order by e.id), coalesce(sum(e.amount - e.paid_amount), 0) into v_ids, v_total
  from public.v_teacher_countable_earnings e
  where e.teacher_id = po.teacher_id and e.amount > e.paid_amount
    and e.lesson_id in (select x::uuid from jsonb_array_elements_text(
                          coalesce(po.breakdown -> 'lesson_ids', '[]'::jsonb)) x);
  if v_total = 0 then
    return null; -- everything was already paid per session
  end if;
  perform 1 from public.teacher_session_earnings where id = any (v_ids) order by id for update;
  insert into public.teacher_payments (teacher_id, amount, paid_at, method, note, payout_id, created_by)
  values (po.teacher_id, v_total, coalesce(p_paid_at, now()), 'other', 'monthly payout ' || po.month,
          p_payout, p_actor)
  returning id into v_payment;
  insert into public.teacher_payment_items (payment_id, earning_id, amount)
  select v_payment, e.id, e.amount - e.paid_amount from public.teacher_session_earnings e where e.id = any (v_ids);
  update public.teacher_session_earnings e set paid_amount = e.amount, status = 'paid' where e.id = any (v_ids);
  return v_payment;
end $$;

create function public.void_teacher_payment(p_payment uuid, p_actor uuid, p_reason text)
  returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  pay record;
  it record;
  v_lessons uuid[] := '{}';
begin
  select * into pay from public.teacher_payments where id = p_payment for update;
  if not found then
    raise exception 'payment_not_found' using errcode = 'P0001';
  end if;
  if pay.voided_at is not null then
    raise exception 'already_voided' using errcode = 'P0001';
  end if;
  for it in
    select i.amount, e.id, e.lesson_id, e.amount as owed, e.paid_amount
    from public.teacher_payment_items i
    join public.teacher_session_earnings e on e.id = i.earning_id
    where i.payment_id = p_payment order by e.id for update of e
  loop
    update public.teacher_session_earnings
       set paid_amount = greatest(it.paid_amount - it.amount, 0),
           status = public.earning_status(greatest(it.paid_amount - it.amount, 0), it.owed)
     where id = it.id;
    v_lessons := v_lessons || it.lesson_id;
  end loop;
  update public.teacher_payments
     set voided_at = now(), voided_by = p_actor, void_reason = p_reason where id = p_payment;
  -- re-judge each session: one that stopped counting and is now unpaid disappears
  perform public.sync_teacher_earning(x) from unnest(v_lessons) x;
  if pay.payout_id is not null then
    update public.teacher_payouts
       set status = 'approved', paid_at = null, paid_by = null, method = null, note = null, receipt_path = null
     where id = pay.payout_id and status = 'paid';
  end if;
  insert into public.audit_log (actor_id, entity, entity_id, action, before, after)
  values (p_actor, 'teacher_payments', p_payment, 'void',
          jsonb_build_object('amount', pay.amount, 'teacher_id', pay.teacher_id, 'payout_id', pay.payout_id),
          jsonb_build_object('reason', p_reason, 'sessions', coalesce(array_length(v_lessons, 1), 0)));
  return jsonb_build_object('payment_id', p_payment, 'sessions', coalesce(array_length(v_lessons, 1), 0));
end $$;

create function public.pay_payout(p_payout uuid, p_actor uuid, p jsonb)
  returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  po record;
  v_paid_at timestamptz := coalesce(nullif(p ->> 'paid_at', '')::timestamptz, now());
  v_payment uuid;
begin
  select * into po from public.teacher_payouts where id = p_payout for update;
  if not found then
    raise exception 'payout_not_found' using errcode = 'P0001';
  end if;
  if po.status <> 'approved' then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  v_payment := public.settle_payout_in_ledger(p_payout, p_actor, v_paid_at);
  if v_payment is not null then
    update public.teacher_payments
       set method = coalesce(nullif(p ->> 'method', '')::public.payment_method, method),
           note = coalesce(nullif(p ->> 'note', ''), note),
           receipt_path = nullif(p ->> 'receipt_path', '')
     where id = v_payment;
  end if;
  update public.teacher_payouts
     set status = 'paid', paid_at = v_paid_at, paid_by = p_actor,
         method = nullif(p ->> 'method', '')::public.payment_method,
         note = nullif(p ->> 'note', ''), receipt_path = nullif(p ->> 'receipt_path', '')
   where id = p_payout;
  insert into public.audit_log (actor_id, entity, entity_id, action, before, after)
  values (p_actor, 'teacher_payouts', p_payout, 'pay', jsonb_build_object('status', po.status),
          jsonb_build_object('status', 'paid', 'paid_at', v_paid_at, 'payment_id', v_payment,
                             'method', p ->> 'method', 'amount', po.amount));
  return jsonb_build_object('payout_id', p_payout, 'payment_id', v_payment);
end $$;

create function public.unpay_payout(p_payout uuid, p_actor uuid, p_reason text)
  returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  po record;
  v_payment uuid;
begin
  select * into po from public.teacher_payouts where id = p_payout for update;
  if not found then
    raise exception 'payout_not_found' using errcode = 'P0001';
  end if;
  if po.status <> 'paid' then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  select id into v_payment from public.teacher_payments where payout_id = p_payout and voided_at is null;
  if v_payment is not null then
    perform public.void_teacher_payment(v_payment, p_actor, p_reason);
  end if;
  update public.teacher_payouts set status = 'approved', paid_at = null, paid_by = null,
         method = null, note = null, receipt_path = null
   where id = p_payout;
  insert into public.audit_log (actor_id, entity, entity_id, action, before, after)
  values (p_actor, 'teacher_payouts', p_payout, 'unpay',
          jsonb_build_object('status', 'paid', 'paid_at', po.paid_at),
          jsonb_build_object('status', 'approved', 'reason', p_reason, 'voided_payment', v_payment));
  return jsonb_build_object('payout_id', p_payout, 'voided_payment_id', v_payment);
end $$;

create function public.reopen_payout(p_payout uuid, p_actor uuid)
  returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  po record;
begin
  select * into po from public.teacher_payouts where id = p_payout for update;
  if not found then
    raise exception 'payout_not_found' using errcode = 'P0001';
  end if;
  if po.status <> 'approved' then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  update public.teacher_payouts set status = 'draft', approved_at = null, approved_by = null where id = p_payout;
  insert into public.audit_log (actor_id, entity, entity_id, action, before, after)
  values (p_actor, 'teacher_payouts', p_payout, 'reopen',
          jsonb_build_object('status', 'approved', 'approved_at', po.approved_at), jsonb_build_object('status', 'draft'));
  return jsonb_build_object('payout_id', p_payout);
end $$;

revoke execute on function public.void_teacher_payment(uuid, uuid, text), public.pay_payout(uuid, uuid, jsonb),
  public.unpay_payout(uuid, uuid, text), public.reopen_payout(uuid, uuid) from public, anon, authenticated;
grant execute on function public.void_teacher_payment(uuid, uuid, text), public.pay_payout(uuid, uuid, jsonb),
  public.unpay_payout(uuid, uuid, text), public.reopen_payout(uuid, uuid) to service_role;
