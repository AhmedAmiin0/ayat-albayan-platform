-- Assistant (base role `sales`), step 2: commission terms, the commission ledger, monthly statements
-- (owner, 2026-10-06). Mirrors teacher_payouts (migration 121): a statement is draft -> approved ->
-- paid, unique per (assistant, month), frozen once approved. Amounts are per currency, never summed
-- across currencies (statements.totals is {currency: {salary, commissions, adjustments, total}}).
-- Writes: service role only (the API / RPCs of migrations 272, 273). Reads: admin all; a sales user
-- only their own rows, never a draft statement and never the subscription price (RLS, rule 9). Additive
-- and re-runnable.
--   assistant_terms        one row per assistant, set by an admin: commission (percent | fixed + value,
--                          currency for fixed, commission_starts_on = no retroactive commission) and the
--                          monthly salary (amount, currency, salary_starts_on). No history: a change
--                          applies to what is not frozen yet; each commission freezes its own rate.
--   assistant_commissions  at most ONE per student (unique student_id): the first time any of the
--                          student's subscriptions is fully paid. voided = reversed (void_auto: a payment
--                          change did it; the next full payment reinstates it, a manual void stays).
--   assistant_adjustments  signed corrections carried into a statement: a reversal when a commission
--                          already inside an approved or paid statement is voided, or a manual +/-.
do $$ begin
  create type public.assistant_commission_type as enum ('percent', 'fixed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.assistant_commission_status as enum ('earned', 'voided');
exception when duplicate_object then null; end $$;

create table if not exists public.assistant_terms (
  assistant_id uuid primary key references public.profiles (id),
  commission_type public.assistant_commission_type,
  commission_value numeric(12, 2) check (commission_value >= 0),
  commission_currency text check (commission_currency ~ '^[A-Z]{3}$'),
  commission_starts_on date,
  salary_amount numeric(12, 2) check (salary_amount >= 0),
  salary_currency text check (salary_currency ~ '^[A-Z]{3}$'),
  salary_starts_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id),
  constraint assistant_terms_commission_check check (
    (commission_type is null and commission_value is null and commission_currency is null
       and commission_starts_on is null)
    or (commission_type = 'percent' and commission_value <= 100 and commission_currency is null
       and commission_starts_on is not null)
    or (commission_type = 'fixed' and commission_value is not null and commission_currency is not null
       and commission_starts_on is not null)),
  constraint assistant_terms_salary_check check (
    (salary_amount is null and salary_currency is null and salary_starts_on is null)
    or (salary_amount is not null and salary_currency is not null and salary_starts_on is not null))
);
drop trigger if exists assistant_terms_updated_at on public.assistant_terms;
create trigger assistant_terms_updated_at before update on public.assistant_terms
  for each row execute function public.set_updated_at();

-- month = the first day of the month (commissions bucketed by their date in the assistant's tz).
create table if not exists public.assistant_statements (
  id uuid primary key default gen_random_uuid(),
  assistant_id uuid not null references public.profiles (id),
  month date not null check (extract(day from month) = 1),
  status public.payout_status not null default 'draft',
  totals jsonb not null default '{}'::jsonb,
  approved_at timestamptz,
  approved_by uuid references auth.users (id),
  paid_at timestamptz,
  paid_by uuid references auth.users (id),
  method public.payment_method,
  note text,
  receipt_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  unique (assistant_id, month),
  check (status = 'draft' or approved_at is not null),
  check (status <> 'paid' or paid_at is not null)
);
create index if not exists assistant_statements_month_idx on public.assistant_statements (month, status);
drop trigger if exists assistant_statements_updated_at on public.assistant_statements;
create trigger assistant_statements_updated_at before update on public.assistant_statements
  for each row execute function public.set_updated_at();

create table if not exists public.assistant_commissions (
  id uuid primary key default gen_random_uuid(),
  assistant_id uuid not null references public.profiles (id),
  student_id uuid not null unique references public.students (id),
  subscription_id uuid unique references public.subscriptions (id) on delete set null,
  commission_type public.assistant_commission_type not null,
  -- The term's value as it was when earned: percent points, or the fixed amount.
  rate numeric(12, 2) not null check (rate >= 0),
  -- What a percent applies to: the subscription price in its own currency.
  base_amount numeric(12, 2) not null check (base_amount >= 0),
  base_currency text not null check (base_currency ~ '^[A-Z]{3}$'),
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  -- When the subscription became fully paid (the completing payment's paid_at).
  earned_at timestamptz not null,
  status public.assistant_commission_status not null default 'earned',
  voided_at timestamptz,
  void_reason text,
  void_auto boolean,
  statement_id uuid references public.assistant_statements (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'earned' and voided_at is null)
         or (status = 'voided' and voided_at is not null and length(trim(void_reason)) > 0
             and void_auto is not null)),
  check (status = 'voided' or subscription_id is not null)
);
create index if not exists assistant_commissions_assistant_idx
  on public.assistant_commissions (assistant_id, earned_at);
create index if not exists assistant_commissions_statement_idx
  on public.assistant_commissions (statement_id) where statement_id is not null;
drop trigger if exists assistant_commissions_updated_at on public.assistant_commissions;
create trigger assistant_commissions_updated_at before update on public.assistant_commissions
  for each row execute function public.set_updated_at();

create table if not exists public.assistant_adjustments (
  id uuid primary key default gen_random_uuid(),
  assistant_id uuid not null references public.profiles (id),
  commission_id uuid references public.assistant_commissions (id) on delete set null,
  kind text not null check (kind in ('reversal', 'manual')),
  amount numeric(12, 2) not null check (amount <> 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  reason text not null check (length(trim(reason)) > 0),
  -- The first statement month that may take it (first of month); a statement of month M takes
  -- every unlinked adjustment with effective_month <= M.
  effective_month date not null check (extract(day from effective_month) = 1),
  statement_id uuid references public.assistant_statements (id) on delete set null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);
-- A retry of the same manual adjustment carries the same key and lands on the first row (add_assistant_adjustment).
alter table public.assistant_adjustments add column if not exists client_request_id uuid;
create unique index if not exists assistant_adjustments_request_uidx
  on public.assistant_adjustments (assistant_id, client_request_id) where client_request_id is not null;
create index if not exists assistant_adjustments_open_idx
  on public.assistant_adjustments (assistant_id, effective_month) where statement_id is null;
create index if not exists assistant_adjustments_statement_idx
  on public.assistant_adjustments (statement_id) where statement_id is not null;

-- What is inside a statement, frozen with it: salary (signed +), commissions, adjustments (signed).
create table if not exists public.assistant_statement_lines (
  id uuid primary key default gen_random_uuid(),
  statement_id uuid not null references public.assistant_statements (id) on delete cascade,
  kind text not null check (kind in ('salary', 'commission', 'adjustment')),
  commission_id uuid references public.assistant_commissions (id) on delete set null,
  adjustment_id uuid references public.assistant_adjustments (id) on delete set null,
  amount numeric(12, 2) not null check (amount <> 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now()
);
create index if not exists assistant_statement_lines_idx on public.assistant_statement_lines (statement_id);

-- RLS (rule 9): admin reads all, a sales user only their own rows; nobody but the service role writes.
alter table public.assistant_terms enable row level security;
alter table public.assistant_statements enable row level security;
alter table public.assistant_commissions enable row level security;
alter table public.assistant_adjustments enable row level security;
alter table public.assistant_statement_lines enable row level security;

drop policy if exists assistant_terms_admin on public.assistant_terms;
create policy assistant_terms_admin on public.assistant_terms for select to authenticated
  using (public.is_admin());
drop policy if exists assistant_terms_own on public.assistant_terms;
create policy assistant_terms_own on public.assistant_terms for select to authenticated
  using (assistant_id = (select auth.uid()) and public.auth_role() = 'sales');

drop policy if exists assistant_statements_admin on public.assistant_statements;
create policy assistant_statements_admin on public.assistant_statements for select to authenticated
  using (public.is_admin());
drop policy if exists assistant_statements_own on public.assistant_statements;
create policy assistant_statements_own on public.assistant_statements for select to authenticated
  using (assistant_id = (select auth.uid()) and public.auth_role() = 'sales' and status <> 'draft');

drop policy if exists assistant_commissions_admin on public.assistant_commissions;
create policy assistant_commissions_admin on public.assistant_commissions for select to authenticated
  using (public.is_admin());
drop policy if exists assistant_commissions_own on public.assistant_commissions;
create policy assistant_commissions_own on public.assistant_commissions for select to authenticated
  using (assistant_id = (select auth.uid()) and public.auth_role() = 'sales');

drop policy if exists assistant_adjustments_admin on public.assistant_adjustments;
create policy assistant_adjustments_admin on public.assistant_adjustments for select to authenticated
  using (public.is_admin());
drop policy if exists assistant_adjustments_own on public.assistant_adjustments;
create policy assistant_adjustments_own on public.assistant_adjustments for select to authenticated
  using (assistant_id = (select auth.uid()) and public.auth_role() = 'sales');

drop policy if exists assistant_statement_lines_admin on public.assistant_statement_lines;
create policy assistant_statement_lines_admin on public.assistant_statement_lines for select to authenticated
  using (public.is_admin());
drop policy if exists assistant_statement_lines_own on public.assistant_statement_lines;
create policy assistant_statement_lines_own on public.assistant_statement_lines for select to authenticated
  using (public.auth_role() = 'sales' and statement_id in (
    select s.id from public.assistant_statements s
    where s.assistant_id = (select auth.uid()) and s.status <> 'draft'));

revoke all on public.assistant_terms, public.assistant_statements, public.assistant_commissions,
  public.assistant_adjustments, public.assistant_statement_lines from anon;
revoke insert, update, delete, truncate, references, trigger on public.assistant_terms,
  public.assistant_statements, public.assistant_commissions, public.assistant_adjustments,
  public.assistant_statement_lines from authenticated;

-- The second wall hides the subscription's price: a sales user reading PostgREST directly gets the safe
-- columns of her commissions only (no base_amount, base_currency, subscription_id or void_reason). The
-- admin reads the full ledger through the API (service role).
revoke select on public.assistant_commissions from authenticated;
grant select (id, assistant_id, student_id, commission_type, rate, amount, currency, earned_at, status,
  voided_at, statement_id, created_at, updated_at) on public.assistant_commissions to authenticated;
