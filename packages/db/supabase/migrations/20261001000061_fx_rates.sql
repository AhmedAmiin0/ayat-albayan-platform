-- Exchange rates for USD quotes (docs/08 §4). The API (service role, bypasses RLS) is the only
-- writer: it stores each provider update once and bumps fetched_at when it re-reads the same one.
create table public.fx_rates (
  id uuid primary key default gen_random_uuid(),
  base text not null check (base ~ '^[A-Z]{3}$'),
  quote text not null check (quote ~ '^[A-Z]{3}$'),
  rate numeric not null check (rate > 0),
  provider text not null,
  provider_updated_at timestamptz not null,
  fetched_at timestamptz not null default now(),
  unique (base, quote, provider_updated_at)
);
create index fx_rates_newest_idx on public.fx_rates (base, quote, fetched_at desc);

alter table public.fx_rates enable row level security;
create policy fx_rates_admin_read on public.fx_rates for select to authenticated
  using (public.is_admin());
