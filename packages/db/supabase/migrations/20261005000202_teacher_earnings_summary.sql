-- «مستحقات المعلمين» (owner, 2026-10-05): what every teacher earned, was paid and is still owed, from
-- the same ledger rows the per-teacher page shows (v_teacher_countable_earnings, migration 200).
-- Read by GET /teacher-earnings/summary and the dashboard KPI «مستحق للمعلمين» (service role only:
-- a teacher reads their own numbers through /teachers/me/earnings).
create view public.v_teacher_earnings_summary with (security_invoker = true) as
select t.id as teacher_id,
       t.display_name_ar,
       count(e.id)::int as sessions,
       coalesce(sum(e.amount), 0)::numeric(12, 2) as earned,
       coalesce(sum(least(e.paid_amount, e.amount)), 0)::numeric(12, 2) as paid,
       coalesce(sum(greatest(e.amount - e.paid_amount, 0)), 0)::numeric(12, 2) as owed,
       count(e.id) filter (where e.amount > e.paid_amount)::int as unpaid_sessions,
       min(e.starts_at) filter (where e.amount > e.paid_amount) as oldest_unpaid_at
from public.teachers t
join public.v_teacher_countable_earnings e on e.teacher_id = t.id
group by t.id, t.display_name_ar;

revoke all on public.v_teacher_earnings_summary from anon, authenticated;
grant select on public.v_teacher_earnings_summary to service_role;
