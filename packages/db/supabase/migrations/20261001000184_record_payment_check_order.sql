-- record_teacher_payment (migration 178): check that every session belongs to the teacher BEFORE the
-- payment row is inserted. Found by e2e/tests/teacher-payments.sql.spec.ts: a payment for an unknown
-- teacher id failed on teacher_payments_teacher_id_fkey instead of the documented earning_not_found.
-- Same signature and grants, so nothing else changes (types.ts untouched). The per-item check inside
-- the loop stays as the guard for the locked rows.
create or replace function public.record_teacher_payment(p jsonb) returns jsonb
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

  -- Every session must be this teacher's own, BEFORE anything is written: an unknown teacher or someone
  -- else's session answers earning_not_found, never a raw foreign-key error from the payment insert.
  -- (alias `own`, not `e`: `e` is this function's record variable and would shadow the table alias)
  if (select count(*) from public.teacher_session_earnings own
       where own.teacher_id = v_teacher
         and own.id in (select (i ->> 'earning_id')::uuid from jsonb_array_elements(p -> 'items') i))
     <> jsonb_array_length(p -> 'items') then
    raise exception 'earning_not_found' using errcode = 'P0001';
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

revoke execute on function public.record_teacher_payment(jsonb) from public, anon, authenticated;
grant execute on function public.record_teacher_payment(jsonb) to service_role;
