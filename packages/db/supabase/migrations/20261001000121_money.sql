-- Subscriptions, payments, expenses, teacher payouts. R-SUB-01..03, R-PAY-01/02,
-- R-TCH-04, R-RPT-02; issues E1, E3, E4, B5.
create type public.payment_method as enum ('bank', 'wallet', 'cash', 'other');
create type public.payout_status as enum ('draft', 'approved', 'paid');
create type public.expense_category as enum ('ads', 'content', 'tools', 'operations', 'other');

-- One package bought for one student. The price is never typed: the API re-quotes the pricing
-- catalog (docs/08) and stores the quote in price_source; a USD price also keeps its rate.
-- package is null for a custom lesson count (the calculator's 1–60); lessons_total is the truth.
-- lessons_used / remaining / end date are derived (v_subscription_balance), never stored (E1, B5).
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id),
  package public.package_size check (package is distinct from 'trial'),
  duration public.lesson_duration not null,
  lessons_total int not null check (lessons_total > 0),
  price numeric(12, 2) not null check (price >= 0),
  currency text not null default 'SAR' check (currency ~ '^[A-Z]{3}$'),
  fx_rate numeric check (fx_rate is null or fx_rate > 0),
  fx_date timestamptz,
  price_source jsonb not null,
  -- Local day in the student's tz from which lessons may count against this package.
  starts_on date not null,
  status public.subscription_status not null default 'unpaid',
  renews_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);
create index subscriptions_student_idx on public.subscriptions (student_id, starts_on, created_at);
create index subscriptions_status_idx on public.subscriptions (status);
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Manual transfers recorded by an admin (R-PAY-01). receipt_path: bucket receipts,
-- {subscription_id}/{uuid}.{ext}. v1: the API requires currency = the subscription's.
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions (id),
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  method public.payment_method not null,
  paid_at timestamptz not null,
  receipt_path text,
  recorded_by uuid references auth.users (id),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_subscription_idx on public.payments (subscription_id, paid_at);
create index payments_paid_at_idx on public.payments (paid_at);
create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- Ads / content / tools spend, entered by hand per month (R-RPT-02, issue E4).
-- month = the first day of the month.
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  month date not null check (extract(day from month) = 1),
  category public.expense_category not null,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'EGP' check (currency ~ '^[A-Z]{3}$'),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);
create index expenses_month_idx on public.expenses (month);
create trigger expenses_updated_at before update on public.expenses
  for each row execute function public.set_updated_at();

-- Per teacher per month (R-PAY-02, R-TCH-04, issue E3): counted lessons × the teacher's rate for
-- that duration, in EGP. Regenerating a draft month replaces it; approved/paid rows are frozen.
-- month = the first day of the month (lessons bucketed by their local date in the teacher's tz).
create table public.teacher_payouts (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers (id),
  month date not null check (extract(day from month) = 1),
  lessons_count int not null check (lessons_count >= 0),
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'EGP' check (currency = 'EGP'),
  status public.payout_status not null default 'draft',
  approved_at timestamptz,
  approved_by uuid references auth.users (id),
  paid_at timestamptz,
  paid_by uuid references auth.users (id),
  -- [{ duration, lessons, rate, amount }] + the lesson ids counted, so a payout can be audited.
  breakdown jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  unique (teacher_id, month),
  check (status = 'draft' or approved_at is not null),
  check (status <> 'paid' or paid_at is not null)
);
create index teacher_payouts_month_idx on public.teacher_payouts (month, status);
create trigger teacher_payouts_updated_at before update on public.teacher_payouts
  for each row execute function public.set_updated_at();

-- RLS (rule 9): admin all; guardians read their children's subscriptions and payments; a teacher
-- reads own payouts (R-TCH-04). expenses are admin only. The API is the writer.
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;
alter table public.teacher_payouts enable row level security;

create policy subscriptions_admin on public.subscriptions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy subscriptions_guardian_read on public.subscriptions for select to authenticated
  using (student_id in (select public.my_student_ids()));

create policy payments_admin on public.payments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy payments_guardian_read on public.payments for select to authenticated
  using (subscription_id in (select s.id from public.subscriptions s
                             where s.student_id in (select public.my_student_ids())));

create policy expenses_admin on public.expenses for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy teacher_payouts_admin on public.teacher_payouts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy teacher_payouts_teacher_read on public.teacher_payouts for select to authenticated
  using (teacher_id = (select public.my_teacher_id()));

revoke all on public.subscriptions, public.payments, public.expenses, public.teacher_payouts
  from anon;
revoke insert, update, delete, truncate, references, trigger on public.subscriptions,
  public.payments, public.expenses, public.teacher_payouts from authenticated;
