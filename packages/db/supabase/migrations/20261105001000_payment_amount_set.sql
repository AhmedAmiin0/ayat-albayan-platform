-- «تعديل المبلغ» (owner 2026-11-02; review 2026-11-05): a recorded payment's new amount, checked and
-- written in one transaction so two amount edits on the same package (the same payment or two of
-- its payments) cannot both pass the net check. A new refund is not serialized with it (its own
-- check runs in the API before the insert). The package row is locked first (every amount edit of that package waits
-- its turn), then the payment row; the package's net paid (payments − refunds, this one at its new
-- amount) may not go below 0 (P0001 refund_exceeds_paid). p_expected is the amount the API read: a
-- concurrent edit changed it → P0001 payment_amount_changed (the API answers 409, the user reloads).
-- The typed amount is in the package currency, so a converted transfer's original amount and rate
-- are cleared (the audit row the API writes keeps them). The payment triggers (paid state,
-- commissions) fire on this update as on any other.
-- Service role only: the API checks the permission (payments.write / subscriptions.edit_terms), the
-- owner rule and the card lock (stripe_amount_locked) first. Idempotent.
-- SQL test plan (local DB, begin … rollback): package with a 100 payment and a 60 refund →
--   payment_amount_set(payment, 50, 100) → refund_exceeds_paid; (payment, 80, 100) → true, net 20;
--   (payment, 90, 100) again → payment_amount_changed; (unknown id, 1, 1) → payment_not_found.
set local lock_timeout = '5s';

create or replace function public.payment_amount_set(p_payment uuid, p_amount numeric, p_expected numeric)
  returns boolean
  language plpgsql security definer set search_path = '' as $$
declare
  v_sub uuid;
  v_row record;
  v_net numeric;
begin
  select p.subscription_id into v_sub from public.payments p where p.id = p_payment;
  if not found then
    raise exception 'payment_not_found' using errcode = 'P0001';
  end if;
  perform 1 from public.subscriptions s where s.id = v_sub for update;
  select p.amount, p.kind into v_row from public.payments p where p.id = p_payment for update;
  if v_row.amount is distinct from p_expected then
    raise exception 'payment_amount_changed' using errcode = 'P0001';
  end if;
  select coalesce(sum(case when p.kind = 'refund' then -p.amount else p.amount end), 0)
    into v_net from public.payments p where p.subscription_id = v_sub;
  v_net := v_net + (case when v_row.kind = 'refund' then -1 else 1 end) * (p_amount - v_row.amount);
  if v_net < 0 then
    raise exception 'refund_exceeds_paid' using errcode = 'P0001';
  end if;
  update public.payments
     set amount = p_amount, original_amount = null, original_currency = null, fx_rate = null
   where id = p_payment;
  return true;
end $$;
revoke execute on function public.payment_amount_set(uuid, numeric, numeric) from public, anon, authenticated;
grant execute on function public.payment_amount_set(uuid, numeric, numeric) to service_role;

-- MANUAL ROLLBACK (only after the code rollback): drop function public.payment_amount_set(uuid, numeric, numeric).
