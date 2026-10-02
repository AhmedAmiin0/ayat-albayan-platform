-- Admin push log (R-MOB-01): one row per event per admin profile. dedup_key makes a retried event
-- a no-op (rule 8), e.g. `new_lead:{lead_id}:{profile_id}`. ticket_ids = Expo push tickets (one per
-- device token); error = the Expo error when nothing was delivered. new_message is the
-- «رسالة جديدة» the mobile permission screen (mobile.pushRationale) already promises.
create type public.push_kind as enum (
  'new_lead', 'new_message', 'lesson_needs_confirmation', 'report_submitted', 'reminder_failed',
  'payment_due');

create table public.push_notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind public.push_kind not null,
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  dedup_key text not null unique,
  ticket_ids text[] not null default '{}',
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index push_notifications_profile_idx on public.push_notifications (profile_id, created_at desc);

-- RLS (rule 9): admins read; only the API (service role) writes.
alter table public.push_notifications enable row level security;
create policy push_notifications_admin_read on public.push_notifications for select to authenticated
  using (public.is_admin());
revoke all on public.push_notifications from anon;
revoke insert, update, delete, truncate, references, trigger on public.push_notifications
  from authenticated;
