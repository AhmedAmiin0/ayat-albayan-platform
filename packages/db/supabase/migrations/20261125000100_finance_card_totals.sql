-- Finance dashboard card from one aggregate read (audit BE-08; R-RPT-01, R-RPT-02, docs/57 §3.1).
-- The API read every payment, payable lesson, lesson student and expense of the range into Node
-- (four paged reads) only to count and sum them. finance_card_totals returns the same facts
-- already grouped, so the card costs one call whatever the range holds:
--   payment  (month, currency, guardian source)  revenue; a refund is negative; a payment of a
--            package with a quote rate (subscriptions.fx_rate) is booked in SAR at that rate
--   cost     (month, 'EGP', guardian source)     the ledger amount of each payable lesson
--            (v_teacher_payable_lessons, the one pay rule), split equally between its students;
--            a lesson without students is 'unknown'
--   expense  (month, currency, category)         non-draft expenses of the months p_first..p_last
--   unrated  n = payable lessons with no rate (amount null), never costed; its other columns are
--            '' and 0 so every row has one shape
-- Months are Asia/Riyadh months ("YYYY-MM"); conversion to the reporting currency stays in the API
-- (rates come from the FX provider). Reads use payments_paid_at_idx and expenses_month_idx.
-- RLS / grants: security invoker; service role only (the dashboard controller is admin-only).
-- SQL test plan (e2e/tests/reporting/finance-card-totals.sql.spec.ts): a seeded range returns
-- the grouped rows the API mapper turns into today's totals.
-- MANUAL ROLLBACK: drop function public.finance_card_totals(timestamptz, timestamptz, date, date).

create function public.finance_card_totals(
  p_from timestamptz, p_to timestamptz, p_first date, p_last date
) returns table (kind text, month text, currency text, key text, amount numeric, n bigint)
  language sql stable set search_path = '' as $$
  with pay as (
    select to_char(p.paid_at at time zone 'Asia/Riyadh', 'YYYY-MM') as month,
           p.currency,
           coalesce(g.source::text, 'unknown') as key,
           case when p.kind = 'refund' then -p.amount else p.amount end as signed,
           case when p.currency <> 'SAR' then nullif(s.fx_rate, 0) end as quote
    from public.payments p
    left join public.subscriptions s on s.id = p.subscription_id
    left join public.students st on st.id = s.student_id
    left join public.guardians g on g.id = st.guardian_id
    where p.paid_at >= p_from and p.paid_at < p_to
  ),
  lessons as (
    select v.lesson_id, v.amount,
           to_char(v.starts_at at time zone 'Asia/Riyadh', 'YYYY-MM') as month
    from public.v_teacher_payable_lessons v
    where v.starts_at >= p_from and v.starts_at < p_to
  ),
  shares as (
    select l.month, coalesce(g.source::text, 'unknown') as key,
           l.amount / count(*) over (partition by l.lesson_id) as amount
    from lessons l
    left join public.lesson_students ls on ls.lesson_id = l.lesson_id
    left join public.students st on st.id = ls.student_id
    left join public.guardians g on g.id = st.guardian_id
    where l.amount is not null
  )
  select 'payment', pay.month, case when quote is null then pay.currency else 'SAR' end,
         pay.key, sum(signed / coalesce(quote, 1)), count(*)
  from pay
  group by 2, 3, 4
  union all
  select 'cost', shares.month, 'EGP', shares.key, sum(shares.amount), count(*)
  from shares
  group by 2, 4
  union all
  select 'expense', to_char(e.month, 'YYYY-MM'), e.currency, e.category, sum(e.amount), count(*)
  from public.expenses e
  where not e.is_draft and e.month between p_first and p_last
  group by 2, 3, 4
  union all
  select 'unrated', '', '', '', 0::numeric, count(*)
  from lessons
  where lessons.amount is null
$$;

revoke execute on function public.finance_card_totals(timestamptz, timestamptz, date, date)
  from public, anon, authenticated;
grant execute on function public.finance_card_totals(timestamptz, timestamptz, date, date)
  to service_role;
