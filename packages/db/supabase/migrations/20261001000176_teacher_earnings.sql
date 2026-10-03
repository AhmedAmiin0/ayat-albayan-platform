-- Per-session teacher earnings (owner request: «مدفوعات المعلمين لكل حلقة»), part 1: the tables.
--   * teacher_session_earnings: ONE row per paid lesson (lesson_id unique) = what the teacher
--     earned for it: minutes, the rate frozen when it was earned, amount (one amount per lesson,
--     however many students), currency EGP. Kept in step with the lesson by migration 177's
--     trigger; the API never writes it.
--   * teacher_payments: money the academy actually handed to a teacher (method, receipt, note).
--     client_request_id makes a retried form idempotent (as payments, migration 132);
--     payout_id marks the payment that settled a monthly payout's sessions (migration 178).
--   * teacher_payment_items: which session(s) a payment covers and how much of each, so one
--     payment can cover several sessions and a session can be paid in parts.
-- Receipts reuse the private `receipts` bucket: receipts/{teacher_id}/{uuid}.{ext}.
-- RLS (rule 9): admin all; a teacher reads ONLY her own rows; nobody else. The API writes
-- through the service role (guards: admin writes, teacher reads own).
create type public.teacher_earning_status as enum ('earned', 'partially_paid', 'paid');

create table public.teacher_session_earnings (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null unique references public.lessons (id),
  teacher_id uuid not null references public.teachers (id),
  -- Copy of lessons.starts_at (kept by the trigger): "oldest first" and the month need no join.
  starts_at timestamptz not null,
  minutes int not null check (minutes in (30, 45, 60, 90)),
  rate numeric(12, 2) not null check (rate >= 0),
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'EGP' check (currency = 'EGP'),
  status public.teacher_earning_status not null default 'earned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index teacher_session_earnings_teacher_idx
  on public.teacher_session_earnings (teacher_id, starts_at);
create index teacher_session_earnings_open_idx
  on public.teacher_session_earnings (teacher_id, starts_at) where status <> 'paid';
create trigger teacher_session_earnings_updated_at before update on public.teacher_session_earnings
  for each row execute function public.set_updated_at();

create table public.teacher_payments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers (id),
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'EGP' check (currency = 'EGP'),
  paid_at timestamptz not null,
  method public.payment_method not null,
  receipt_path text,
  note text,
  client_request_id uuid,
  payout_id uuid references public.teacher_payouts (id),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);
create index teacher_payments_teacher_idx on public.teacher_payments (teacher_id, paid_at desc);
create unique index teacher_payments_client_request_id_key on public.teacher_payments (client_request_id)
  where client_request_id is not null;
create unique index teacher_payments_receipt_path_key on public.teacher_payments (receipt_path)
  where receipt_path is not null;
create unique index teacher_payments_payout_id_key on public.teacher_payments (payout_id)
  where payout_id is not null;

create table public.teacher_payment_items (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.teacher_payments (id) on delete cascade,
  earning_id uuid not null references public.teacher_session_earnings (id),
  amount numeric(12, 2) not null check (amount > 0),
  unique (payment_id, earning_id)
);
create index teacher_payment_items_earning_idx on public.teacher_payment_items (earning_id);

alter table public.teacher_session_earnings enable row level security;
alter table public.teacher_payments enable row level security;
alter table public.teacher_payment_items enable row level security;

create policy teacher_session_earnings_admin on public.teacher_session_earnings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy teacher_session_earnings_teacher_read on public.teacher_session_earnings
  for select to authenticated using (teacher_id = (select public.my_teacher_id()));

create policy teacher_payments_admin on public.teacher_payments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy teacher_payments_teacher_read on public.teacher_payments
  for select to authenticated using (teacher_id = (select public.my_teacher_id()));

create policy teacher_payment_items_admin on public.teacher_payment_items for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy teacher_payment_items_teacher_read on public.teacher_payment_items
  for select to authenticated
  using (earning_id in (select e.id from public.teacher_session_earnings e
                        where e.teacher_id = (select public.my_teacher_id())));

revoke all on public.teacher_session_earnings, public.teacher_payments,
  public.teacher_payment_items from anon;
revoke insert, update, delete, truncate, references, trigger on public.teacher_session_earnings,
  public.teacher_payments, public.teacher_payment_items from authenticated;
