-- «اختر أيام الحلقات» before the payment (owner 2026-11-06: «make picking the time before the payment
-- available, and it gets confirmed after the payment, but also keep it editable»). The assistant's
-- weekly days and times for a package that is UNPAID with an OPEN payment link are kept here as a
-- DRAFT: nothing goes to schedule_rules / lessons and nobody is told until the package is paid; then
-- the API books it through the normal assistant course booking and deletes the row. One draft per
-- package (saved again = edited). `request` is the course's POST /sales/booking body, parsed with
-- zod on every read by the API. Only the API (service role) reads and writes: RLS on, no client
-- policy, no grant to anon / authenticated. Times UTC.
-- Expand-only, idempotent.
-- MANUAL ROLLBACK: drop table if exists public.subscription_course_drafts;

set local lock_timeout = '5s';

create table if not exists public.subscription_course_drafts (
  subscription_id uuid primary key references public.subscriptions (id) on delete cascade,
  request jsonb not null check (jsonb_typeof(request) = 'object' and pg_column_size(request) <= 8192),
  saved_by uuid not null references public.profiles (id),
  saved_at timestamptz not null default now()
);

comment on table public.subscription_course_drafts is
  'A package''s weekly days picked before its payment (owner 2026-11-06); booked on payment. Service role only.';

create index if not exists subscription_course_drafts_saved_by_idx
  on public.subscription_course_drafts (saved_by);

alter table public.subscription_course_drafts enable row level security;
revoke all on public.subscription_course_drafts from anon, authenticated;
