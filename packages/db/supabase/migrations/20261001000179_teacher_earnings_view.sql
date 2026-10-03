-- Per-session teacher earnings, part 4: the read model. One row per earning with what was paid
-- and what is outstanding (never negative: a shrink below what was paid reads as 0 due).
-- security_invoker: the view obeys the caller's RLS (a teacher sees only her own rows).
create view public.v_teacher_earnings with (security_invoker = on) as
select e.id, e.lesson_id, e.teacher_id, e.starts_at, e.minutes, e.rate, e.amount, e.currency,
       e.status, e.created_at,
       coalesce(p.paid, 0)::numeric(12, 2) as paid,
       greatest(e.amount - coalesce(p.paid, 0), 0)::numeric(12, 2) as outstanding
  from public.teacher_session_earnings e
  left join (select earning_id, sum(amount) as paid
               from public.teacher_payment_items group by earning_id) p on p.earning_id = e.id;

revoke all on public.v_teacher_earnings from anon;
grant select on public.v_teacher_earnings to authenticated, service_role;
