-- Stripe payment links, TEST BUILD ONLY (owner 2026-10-28, docs/30-stripe-test.md): the assistant agrees an
-- amount in the chat, creates a link, the family pays it on Stripe Checkout, and the verified webhook records
-- the payment through the normal payments path (so the paid rule, the package status and the assistant's
-- commission triggers run exactly as for a bank transfer).
--
--   * payment_links: one row per link; token = the random, url-safe part of https://<web>/pay/<token>.
--     The subscription is created with the link (sales subscribe flow), so subscription_id is set at once;
--     nullable for a package cancelled / deleted later. RLS: admins all; a salesperson reads and inserts
--     her own (created_by); anon nothing. The API writes with the service role.
--   * stripe_events: the webhook's idempotency (event_id primary key). API only: RLS on, no policy.
--   * stripe_settings: the gate's DB half (stripe_enabled, default false) and max_discount_pct (null = no
--     cap). One row. Admins read; the API writes. Kept out of public.settings so the normal build's
--     settings page never shows a Stripe field.
--   * stripe_secret_*: the restricted key and the webhook signing secret in Vault (names stripe:api_key,
--     stripe:webhook_secret; never in integration_*'s namespace). A live key (sk_live_ / rk_live_) is
--     refused here too: the test build accepts test keys only. Service role only.
--   * payment_method 'card' (a Checkout payment). Never used in this file (a new enum value cannot be used
--     in the transaction that adds it).
--
-- Idempotent and expand-only: the previous API never reads or writes any of it.
-- Rollback: drop table public.payment_links, public.stripe_events, public.stripe_settings; drop the four
--           stripe_secret_* functions; delete from vault.secrets where name like 'stripe:%'.
--           ('card' stays: an enum value cannot be dropped.)

set local lock_timeout = '5s';

alter type public.payment_method add value if not exists 'card';

create table if not exists public.payment_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique check (token ~ '^[A-Za-z0-9_-]{32,64}$'),
  student_id uuid not null references public.students (id),
  subscription_id uuid references public.subscriptions (id) on delete set null,
  kind text not null check (kind in ('new', 'renewal')),
  package public.package_size,
  lessons int not null check (lessons > 0),
  duration int not null check (duration > 0),
  amount numeric(12, 2) not null check (amount > 0),
  reference_price numeric(12, 2) not null check (reference_price >= 0),
  currency text not null check (currency in ('SAR', 'USD')),
  created_by uuid not null references public.profiles (id),
  status text not null default 'open' check (status in ('open', 'paid', 'expired', 'cancelled')),
  expires_at timestamptz not null default now() + interval '7 days',
  stripe_session_id text unique,
  stripe_payment_intent text unique,
  paid_payment_id uuid references public.payments (id) on delete set null,
  paid_at timestamptz,
  -- Checkout completed with an asynchronous method still pending (payment_status unpaid).
  processing boolean not null default false,
  client_request_id uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payment_links_created_by_idx on public.payment_links (created_by, created_at desc);
create index if not exists payment_links_student_idx on public.payment_links (student_id);
create index if not exists payment_links_subscription_idx on public.payment_links (subscription_id);
create index if not exists payment_links_paid_payment_idx on public.payment_links (paid_payment_id);

alter table public.payment_links enable row level security;
revoke all on table public.payment_links from anon;
drop policy if exists payment_links_admin on public.payment_links;
create policy payment_links_admin on public.payment_links for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists payment_links_own_read on public.payment_links;
create policy payment_links_own_read on public.payment_links for select to authenticated
  using (created_by = (select auth.uid()) and public.auth_role() = 'sales');
drop policy if exists payment_links_own_insert on public.payment_links;
create policy payment_links_own_insert on public.payment_links for insert to authenticated
  with check (created_by = (select auth.uid()) and public.auth_role() = 'sales');

create table if not exists public.stripe_events (
  event_id text primary key check (event_id ~ '^evt_[A-Za-z0-9]+$'),
  type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  result text
);
alter table public.stripe_events enable row level security;
revoke all on table public.stripe_events from anon, authenticated;

create table if not exists public.stripe_settings (
  id boolean primary key default true check (id),
  stripe_enabled boolean not null default false,
  max_discount_pct numeric(5, 2) check (max_discount_pct between 0 and 100),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);
insert into public.stripe_settings (id) values (true) on conflict do nothing;
alter table public.stripe_settings enable row level security;
revoke all on table public.stripe_settings from anon;
revoke insert, update, delete, truncate, references, trigger on public.stripe_settings from authenticated;
drop policy if exists stripe_settings_admin_read on public.stripe_settings;
create policy stripe_settings_admin_read on public.stripe_settings for select to authenticated
  using (public.is_admin());

create or replace function public.stripe_secret_name_ok(p_name text) returns boolean
  language sql immutable set search_path = '' as $$
  select p_name in ('api_key', 'webhook_secret');
$$;

-- Create or replace one secret. Never returns or logs the value; a live key is refused (test build).
create or replace function public.stripe_secret_set(p_name text, p_value text) returns void
  language plpgsql security definer set search_path = '' as $$
declare
  existing uuid;
begin
  if not public.stripe_secret_name_ok(p_name) then
    raise exception 'unknown stripe secret' using errcode = '22023';
  end if;
  if p_value is null or btrim(p_value) = '' or octet_length(p_value) > 512 then
    raise exception 'invalid stripe secret value' using errcode = '22023';
  end if;
  if p_name = 'api_key' and p_value !~ '^(rk|sk)_test_' then
    raise exception 'stripe_live_key_refused' using errcode = '22023';
  end if;
  if p_name = 'webhook_secret' and p_value !~ '^whsec_' then
    raise exception 'invalid stripe secret value' using errcode = '22023';
  end if;
  select id into existing from vault.secrets where name = 'stripe:' || p_name;
  if existing is null then
    perform vault.create_secret(p_value, 'stripe:' || p_name, 'Stripe test build (admin, /admin/settings)');
  else
    perform vault.update_secret(existing, p_value);
  end if;
end;
$$;

create or replace function public.stripe_secret_clear(p_name text) returns boolean
  language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  if not public.stripe_secret_name_ok(p_name) then
    raise exception 'unknown stripe secret' using errcode = '22023';
  end if;
  delete from vault.secrets where name = 'stripe:' || p_name;
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

-- The decrypted value, for the API's Stripe client and webhook check only (service role).
create or replace function public.stripe_secret_read(p_name text) returns text
  language sql security definer set search_path = '' as $$
  select s.decrypted_secret from vault.decrypted_secrets s
  where public.stripe_secret_name_ok(p_name) and s.name = 'stripe:' || p_name;
$$;

-- Which secrets are set and when: NO values (the admin section's status).
create or replace function public.stripe_secrets_status() returns table (name text, updated_at timestamptz)
  language sql security definer set search_path = '' as $$
  select substr(s.name, length('stripe:') + 1), s.updated_at from vault.secrets s
  where s.name like 'stripe:%' and public.stripe_secret_name_ok(substr(s.name, length('stripe:') + 1));
$$;

revoke all on function public.stripe_secret_name_ok(text) from public, anon, authenticated;
revoke all on function public.stripe_secret_set(text, text) from public, anon, authenticated;
revoke all on function public.stripe_secret_clear(text) from public, anon, authenticated;
revoke all on function public.stripe_secret_read(text) from public, anon, authenticated;
revoke all on function public.stripe_secrets_status() from public, anon, authenticated;
grant execute on function public.stripe_secret_name_ok(text) to service_role;
grant execute on function public.stripe_secret_set(text, text) to service_role;
grant execute on function public.stripe_secret_clear(text) to service_role;
grant execute on function public.stripe_secret_read(text) to service_role;
grant execute on function public.stripe_secrets_status() to service_role;
