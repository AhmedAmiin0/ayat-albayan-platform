-- Money out to a teacher (migration 176), in one transaction each, service_role only.
--
-- record_teacher_payment(p): p = {actor, teacher_id, client_request_id?, amount, method, paid_at,
--   receipt_path?, note?, items: [{earning_id, amount}]}. Raises (P0001): allocation_mismatch (items
--   do not add up to amount), allocation_invalid (a non-positive item or a repeated session),
--   earning_not_found (not that teacher's), overpayment (an item above what is still outstanding).
--   A repeated client_request_id returns the payment already recorded ({replayed: true}).
--
-- settle_payout_in_ledger(payout, actor, paid_at): marking a monthly payout paid pays the still
--   outstanding part of its lessons in the ledger, once (teacher_payments.payout_id), so the
--   month's statement and the per-session payments never count the same lesson twice.
create function public.record_teacher_payment(p jsonb) returns jsonb
  language plpgsql set search_path = '' as $$
declare
  v_teacher uuid := (p ->> 'teacher_id')::uuid;
  v_request uuid := nullif(p ->> 'client_request_id', '')::uuid;
  v_amount numeric := (p ->> 'amount')::numeric;
  v_payment uuid;
  v_item record;
  e record;
begin
  if v_request is not null then
    select id into v_payment from public.teacher_payments where client_request_id = v_request;
    if found then
      return jsonb_build_object('payment_id', v_payment, 'replayed', true);
    end if;
  end if;
  if v_amount is null or v_amount <= 0
     or v_amount <> (select coalesce(sum((i ->> 'amount')::numeric), 0)
                     from jsonb_array_elements(p -> 'items') i) then
    raise exception 'allocation_mismatch' using errcode = 'P0001';
  end if;
  if (select count(distinct i ->> 'earning_id') from jsonb_array_elements(p -> 'items') i)
     <> jsonb_array_length(p -> 'items')
     or exists (select 1 from jsonb_array_elements(p -> 'items') i where (i ->> 'amount')::numeric <= 0) then
    raise exception 'allocation_invalid' using errcode = 'P0001';
  end if;

  insert into public.teacher_payments (teacher_id, amount, paid_at, method, receipt_path, note,
                                       client_request_id, created_by)
  values (v_teacher, v_amount, (p ->> 'paid_at')::timestamptz, (p ->> 'method')::public.payment_method,
          nullif(p ->> 'receipt_path', ''), nullif(p ->> 'note', ''), v_request, (p ->> 'actor')::uuid)
  on conflict (client_request_id) where client_request_id is not null do nothing
  returning id into v_payment;
  if v_payment is null then -- lost the race to a retry of the same form
    select id into v_payment from public.teacher_payments where client_request_id = v_request;
    return jsonb_build_object('payment_id', v_payment, 'replayed', true);
  end if;

  -- Locked in id order: two payments over the same sessions never deadlock.
  for v_item in
    select (i ->> 'earning_id')::uuid as earning_id, (i ->> 'amount')::numeric as amount
    from jsonb_array_elements(p -> 'items') i order by 1
  loop
    select * into e from public.teacher_session_earnings
     where id = v_item.earning_id and teacher_id = v_teacher for update;
    if not found then
      raise exception 'earning_not_found' using errcode = 'P0001';
    end if;
    if v_item.amount > e.amount - e.paid_amount then
      raise exception 'overpayment' using errcode = 'P0001';
    end if;
    insert into public.teacher_payment_items (payment_id, earning_id, amount)
    values (v_payment, e.id, v_item.amount);
    update public.teacher_session_earnings
       set paid_amount = e.paid_amount + v_item.amount,
           status = public.earning_status(e.paid_amount + v_item.amount, e.amount)
     where id = e.id;
  end loop;

  insert into public.audit_log (actor_id, entity, entity_id, action, after)
  values ((p ->> 'actor')::uuid, 'teacher_payments', v_payment, 'create',
          jsonb_build_object('teacher_id', v_teacher, 'amount', v_amount, 'items', p -> 'items'));
  return jsonb_build_object('payment_id', v_payment, 'replayed', false);
end $$;

create function public.settle_payout_in_ledger(p_payout uuid, p_actor uuid, p_paid_at timestamptz)
  returns uuid language plpgsql set search_path = '' as $$
declare
  po record;
  v_payment uuid;
  v_total numeric;
begin
  select * into po from public.teacher_payouts where id = p_payout;
  if not found then
    raise exception 'payout_not_found' using errcode = 'P0001';
  end if;
  select id into v_payment from public.teacher_payments where payout_id = p_payout;
  if found then
    return v_payment;
  end if;

  select coalesce(sum(e.amount - e.paid_amount), 0) into v_total
  from public.teacher_session_earnings e
  where e.teacher_id = po.teacher_id and e.amount > e.paid_amount
    and e.lesson_id in (select x::uuid from jsonb_array_elements_text(
                          coalesce(po.breakdown -> 'lesson_ids', '[]'::jsonb)) x);
  if v_total = 0 then
    return null; -- everything was already paid per session
  end if;

  insert into public.teacher_payments (teacher_id, amount, paid_at, method, note, payout_id, created_by)
  values (po.teacher_id, v_total, coalesce(p_paid_at, now()), 'other', 'monthly payout ' || po.month,
          p_payout, p_actor)
  returning id into v_payment;
  insert into public.teacher_payment_items (payment_id, earning_id, amount)
  select v_payment, e.id, e.amount - e.paid_amount
  from public.teacher_session_earnings e
  where e.teacher_id = po.teacher_id and e.amount > e.paid_amount
    and e.lesson_id in (select x::uuid from jsonb_array_elements_text(
                          coalesce(po.breakdown -> 'lesson_ids', '[]'::jsonb)) x);
  update public.teacher_session_earnings e set paid_amount = e.amount, status = 'paid'
  where e.id in (select earning_id from public.teacher_payment_items where payment_id = v_payment);
  return v_payment;
end $$;

revoke execute on function public.record_teacher_payment(jsonb),
  public.settle_payout_in_ledger(uuid, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.record_teacher_payment(jsonb),
  public.settle_payout_in_ledger(uuid, uuid, timestamptz) to service_role;
