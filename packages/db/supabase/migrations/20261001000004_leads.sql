-- leads keyed by E.164 phone. R-LEAD-01, R-LEAD-03.
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  phone_e164 public.e164 not null unique,
  name text,
  source public.lead_source not null default 'whatsapp_direct',
  status public.lead_status not null default 'new',
  tz text,
  qualification jsonb not null default '{}'::jsonb,
  assigned_to uuid references public.profiles (id),
  last_inbound_at timestamptz,
  last_outbound_at timestamptz,
  next_follow_up_at timestamptz,
  converted_guardian_id uuid references public.guardians (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);
create index leads_status_idx on public.leads (status, last_inbound_at desc);
create trigger leads_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

alter table public.leads enable row level security;
create policy leads_admin on public.leads for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
