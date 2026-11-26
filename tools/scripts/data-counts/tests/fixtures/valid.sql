-- Counts the finance schemas would reject.
-- count: payments_amount_null
select count(*) from payments where amount_minor is null;

-- count: payments_status_unknown
select count(*)
  from public.payments
  where status::text not in ('pending', 'paid', 'refunded');

-- count: payments_total
select count(*) from payments;
