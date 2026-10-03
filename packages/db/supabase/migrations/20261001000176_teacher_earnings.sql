-- Per-session teacher pay (owner request: pay a teacher for each session, teachers see their money).
-- A ledger on top of the monthly statement (teacher_payouts, migration 121):
--   * teacher_session_earnings: one row per counted lesson (lesson_id unique) = what the academy
--     owes the teacher for it. Kept in step with the lesson by migration 177 (triggers).
--   * teacher_payments: one money transfer to a teacher (method, receipt, note).
--   * teacher_payment_items: how a payment is split over sessions, so one payment can cover
--     several sessions and a session can be paid in parts.
-- Rule against double counting (docs/11 §10): a monthly payout marked paid settles the ledger for
-- its lessons (teacher_payments.payout_id), and only for what is still outstanding there.
-- SQL test plan: e2e/tests/teacher-earnings.sql.spec.ts (begin … rollback).
create type public.teacher_earning_status as enum ('earned', 'partially_paid', 'paid');

create table public.teacher_session_earnings (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null unique references public.lessons (id) on delete cascade,
  teacher_id uuid not null references public.teachers (id),
  -- copy of lessons.starts_at (oldest-first allocation and listing without a join)
  starts_at timestamptz not null,
  minutes int not null check (minutes in (30, 45, 60, 90)),
  -- the teacher's rate for `minutes` when the earning was made; one amount per lesson (R-PAY-02)
  rate numeric(12, 2) not null check (rate >= 0),
  amount numeric(12, 2) not null check (amount >= 0),
  -- sum of teacher_payment_items; written only by record_teacher_payment / settle_payout_in_ledger
  paid_amount numeric(12, 2) not null default 0 check (paid_amount >= 0),
  currency text not null default 'EGP' check (currency = 'EGP'),
  status public.teacher_earning_status not null default 'earned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index teacher_session_earnings_teacher_idx on public.teacher_session_earnings (teacher_id, starts_at);
create index teacher_session_earnings_status_idx on public.teacher_session_earnings (teacher_id, status);
create trigger teacher_session_earnings_updated_at before update on public.teacher_session_earnings
  for each row execute function public.set_updated_at();

-- receipt_path: bucket receipts, {teacher_id}/{uuid}.{ext} (the existing private bucket).
create table public.teacher_payments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers (id),
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'EGP' check (currency = 'EGP'),
  paid_at timestamptz not null,
  method public.payment_method not null,
  receipt_path text,
  note text,
  -- idempotency (rule 8): a retried form returns the payment already recorded
  client_request_id uuid,
  -- set when this payment was made by marking a monthly payout paid (one settlement per payout)
  payout_id uuid references public.teacher_payouts (id),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);
create unique index teacher_payments_client_request_key on public.teacher_payments (client_request_id)
  where client_request_id is not null;
create unique index teacher_payments_payout_key on public.teacher_payments (payout_id)
  where payout_id is not null;
create unique index teacher_payments_receipt_key on public.teacher_payments (receipt_path)
  where receipt_path is not null;
create index teacher_payments_teacher_idx on public.teacher_payments (teacher_id, paid_at desc);

create table public.teacher_payment_items (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.teacher_payments (id) on delete cascade,
  earning_id uuid not null references public.teacher_session_earnings (id),
  amount numeric(12, 2) not null check (amount > 0),
  unique (payment_id, earning_id)
);
create index teacher_payment_items_earning_idx on public.teacher_payment_items (earning_id);

-- RLS (rule 9): admins all; a teacher reads only their own rows; nobody else. The API writes.
alter table public.teacher_session_earnings enable row level security;
alter table public.teacher_payments enable row level security;
alter table public.teacher_payment_items enable row level security;

create policy teacher_session_earnings_admin on public.teacher_session_earnings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy teacher_session_earnings_teacher_read on public.teacher_session_earnings for select to authenticated
  using (teacher_id = (select public.my_teacher_id()));

create policy teacher_payments_admin on public.teacher_payments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy teacher_payments_teacher_read on public.teacher_payments for select to authenticated
  using (teacher_id = (select public.my_teacher_id()));

create policy teacher_payment_items_admin on public.teacher_payment_items for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy teacher_payment_items_teacher_read on public.teacher_payment_items for select to authenticated
  using (earning_id in (select e.id from public.teacher_session_earnings e
                        where e.teacher_id = (select public.my_teacher_id())));

revoke all on public.teacher_session_earnings, public.teacher_payments, public.teacher_payment_items
  from anon;
revoke insert, update, delete, truncate, references, trigger on public.teacher_session_earnings,
  public.teacher_payments, public.teacher_payment_items from authenticated;
