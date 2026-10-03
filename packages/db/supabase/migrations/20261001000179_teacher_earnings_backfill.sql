-- Backfill of the per-session ledger from the lessons that already happened. Idempotent: the sync
-- rule inserts a missing earning and leaves a fully paid one alone; a payout settles only once
-- (teacher_payments.payout_id), so running it again changes nothing.
--   1. every completed (and, per settings, late / no_show) lesson gets its earning;
--   2. every monthly payout already `paid` settles the ledger for its lessons, so a teacher who
--      was paid by the monthly statement is not shown as owed the same sessions again.
-- Approved but unpaid payouts settle when they are marked paid, not here.
select public.resync_teacher_earnings(null);

select public.settle_payout_in_ledger(p.id, p.paid_by, p.paid_at)
from public.teacher_payouts p
where p.status = 'paid'
order by p.month;
