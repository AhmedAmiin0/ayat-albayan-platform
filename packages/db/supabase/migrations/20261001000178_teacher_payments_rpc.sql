-- Per-session teacher earnings, part 3: recording money, atomically.
--   refresh_earning_status(earning) : status from the items (paid ≥ amount → paid, > 0 →
--                                     partially_paid, else earned). The only status writer
--                                     besides sync_lesson_earning.
--   record_teacher_payment(p)       : one transaction, service_role only. Payload:
--     {actor, teacher_id, amount, method, paid_at, receipt_path, note, client_request_id,
--      items:[{earning_id, amount}]}. Returns {payment_id, replayed}.
--     * client_request_id seen before → the payment already recorded (replayed: true).
--     * every earning must be this teacher's (else earning_not_found), every item > 0 and ≤ the
--       earning's outstanding (else over_payment; locked FOR UPDATE, so two admins racing cannot
--       both overpay), items must add up to amount (else amount_mismatch). P0001 errors.
--   settle_payout_ledger(payout, actor): paying a MONTHLY payout (Y4) pays the sessions it counted:
--     one teacher_payments row (method 'other', payout_id = the payout, note «payout YYYY-MM»)
--     covering exactly what is still outstanding on those sessions; sessions already paid through
--     the ledger are not paid twice. Idempotent (unique payout_id). Returns the payment id or null.
--   The rule is documented in docs/11 §8b.
-- SQL tests: e2e/tests/teacher-earnings.sql.spec.ts.

create function public.refresh_earning_status(p_earning uuid) returns void
  language sql security definer set search_path = '' as $$
  update public.teacher_session_earnings e
     set status = case
       when s.paid > 0 and s.paid >= e.amount then 'paid'::public.teacher_earning_status
       when s.paid > 0 then 'partially_paid'::public.teacher_earning_status
       else 'earned'::public.teacher_earning_status end
    from (select coalesce(sum(i.amount), 0) as paid
            from public.teacher_payment_items i where i.earning_id = p_earning) s
   where e.id = p_earning
$$;

create function public.record_teacher_payment(p jsonb) returns jsonb
  language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (p ->> 'actor')::uuid;
  v_teacher uuid := (p ->> 'teacher_id')::uuid;
  v_amount numeric := (p ->> 'amount')::numeric;
  v_req uuid := (p ->> 'client_request_id')::uuid;
  v_id uuid;
  v_item record;
  v_count int;
  v_open numeric;
begin
  insert into public.teacher_payments (teacher_id, amount, paid_at, method, receipt_path, note,
                                       client_request_id, created_by)
  values (v_teacher, v_amount, (p ->> 'paid_at')::timestamptz, (p ->> 'method')::public.payment_method,
          nullif(p ->> 'receipt_path', ''), nullif(p ->> 'note', ''), v_req, v_actor)
  on conflict (client_request_id) where client_request_id is not null do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from public.teacher_payments where client_request_id = v_req;
    return jsonb_build_object('payment_id', v_id, 'replayed', true);
  end if;

  select count(*) into v_count from public.teacher_session_earnings e
   where e.teacher_id = v_teacher
     and e.id in (select (i ->> 'earning_id')::uuid from jsonb_array_elements(p -> 'items') i);
  if v_count <> jsonb_array_length(p -> 'items') then
    raise exception 'earning_not_found' using errcode = 'P0001';
  end if;
  perform 1 from public.teacher_session_earnings e
   where e.id in (select (i ->> 'earning_id')::uuid from jsonb_array_elements(p -> 'items') i)
   order by e.id for update;

  if (select coalesce(sum((i ->> 'amount')::numeric), 0) from jsonb_array_elements(p -> 'items') i) <> v_amount then
    raise exception 'amount_mismatch' using errcode = 'P0001';
  end if;

  for v_item in select (i ->> 'earning_id')::uuid as earning_id, (i ->> 'amount')::numeric as amount
                  from jsonb_array_elements(p -> 'items') i loop
    select e.amount - coalesce((select sum(x.amount) from public.teacher_payment_items x
                                 where x.earning_id = e.id), 0)
      into v_open from public.teacher_session_earnings e where e.id = v_item.earning_id;
    if v_item.amount <= 0 or v_item.amount > v_open then
      raise exception 'over_payment' using errcode = 'P0001';
    end if;
    insert into public.teacher_payment_items (payment_id, earning_id, amount)
    values (v_id, v_item.earning_id, v_item.amount);
    perform public.refresh_earning_status(v_item.earning_id);
  end loop;

  insert into public.audit_log (actor_id, entity, entity_id, action, after)
  values (v_actor, 'teacher_payments', v_id, 'create', p - 'actor');
  return jsonb_build_object('payment_id', v_id, 'replayed', false);
end $$;

create function public.settle_payout_ledger(p_payout uuid, p_actor uuid) returns uuid
  language plpgsql security definer set search_path = '' as $$
declare
  o record;
  v_id uuid;
  v_total numeric;
  v_rows jsonb;
begin
  select * into o from public.teacher_payouts where id = p_payout;
  if not found then return null; end if;
  select id into v_id from public.teacher_payments where payout_id = p_payout;
  if v_id is not null then return v_id; end if;

  select coalesce(jsonb_agg(jsonb_build_object('e', q.id, 'a', q.due)), '[]'::jsonb),
         coalesce(sum(q.due), 0)
    into v_rows, v_total
    from (select e.id, e.amount - coalesce(sum(i.amount), 0) as due
            from public.teacher_session_earnings e
            left join public.teacher_payment_items i on i.earning_id = e.id
           where e.teacher_id = o.teacher_id
             and e.lesson_id in (select (x #>> '{}')::uuid
                                   from jsonb_array_elements(o.breakdown -> 'lesson_ids') x)
           group by e.id, e.amount
          having e.amount - coalesce(sum(i.amount), 0) > 0) q;
  if v_total = 0 then return null; end if;

  insert into public.teacher_payments (teacher_id, amount, paid_at, method, note, payout_id, created_by)
  values (o.teacher_id, v_total, coalesce(o.paid_at, now()), 'other',
          'payout ' || to_char(o.month, 'YYYY-MM'), p_payout, p_actor)
  returning id into v_id;
  insert into public.teacher_payment_items (payment_id, earning_id, amount)
  select v_id, (r ->> 'e')::uuid, (r ->> 'a')::numeric from jsonb_array_elements(v_rows) r;
  perform public.refresh_earning_status((r ->> 'e')::uuid) from jsonb_array_elements(v_rows) r;
  return v_id;
end $$;

revoke execute on function public.refresh_earning_status(uuid), public.record_teacher_payment(jsonb),
  public.settle_payout_ledger(uuid, uuid) from public, anon, authenticated;
grant execute on function public.refresh_earning_status(uuid), public.record_teacher_payment(jsonb),
  public.settle_payout_ledger(uuid, uuid) to service_role;

-- Months already paid before this feature: their sessions were paid, so the backfilled ledger
-- must not show them as owed (no double counting).
select public.settle_payout_ledger(id, created_by) from public.teacher_payouts where status = 'paid';
