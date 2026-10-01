-- Job applicants, separate from leads and never in the sales funnel. R-LEAD-04.
create table public.job_applicants (
  id uuid primary key default gen_random_uuid(),
  phone_e164 public.e164 not null unique,
  name text,
  status public.job_applicant_status not null default 'new',
  cv_url text,
  recitation_url text,
  notes text,
  from_lead_id uuid references public.leads (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);
create index job_applicants_status_idx on public.job_applicants (status, created_at desc);
create trigger job_applicants_updated_at before update on public.job_applicants
  for each row execute function public.set_updated_at();

alter table public.job_applicants enable row level security;
create policy job_applicants_admin on public.job_applicants for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
