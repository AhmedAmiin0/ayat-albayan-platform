-- Academy-wide settings (docs/04 §3): follow-up delays, late-cancel hours, reminder offsets.
create table public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);
create trigger settings_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

-- late_cancel_hours = JSON null (a valid jsonb value, not SQL NULL) means OFF: a student's late
-- cancellation never consumes a lesson until the owner sets a number (R-SCH-07, docs/05 §4 q2).
-- booking_horizon_weeks: how far ahead rules generate lessons (R-SCH-02 default 5).
insert into public.settings (key, value) values
  ('late_cancel_hours', 'null'::jsonb),
  ('booking_horizon_weeks', '5'::jsonb);

-- RLS (rule 9): admins read; the API (service role) writes.
alter table public.settings enable row level security;
create policy settings_admin_read on public.settings for select to authenticated
  using (public.is_admin());
