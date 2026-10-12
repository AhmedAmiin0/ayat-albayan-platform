-- Integration config in the database (owner, 2026-10-12: «try not to use .env and make most of the
-- config in the db»). Plain integration values (WhatsApp ids, LiveKit URL, Expo base, FX URL, the
-- staging guards) live in public.integration_config; their secrets (tokens, app secrets, API keys)
-- in Supabase Vault under the name 'integration:<KEY>'. The API reads both with the service role
-- and lets a non-empty DB value win over its env, which stays the fallback (docs/09).
-- Idempotent: safe to run twice.

create extension if not exists supabase_vault with schema vault;

create table if not exists public.integration_config (
  key text primary key check (key ~ '^[A-Z][A-Z0-9_]{2,63}$'),
  value text not null check (octet_length(value) <= 4096),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

drop trigger if exists integration_config_updated_at on public.integration_config;
create trigger integration_config_updated_at before update on public.integration_config
  for each row execute function public.set_updated_at();

-- RLS (rule 9): admins read; only the API (service role) writes, like public.custom_config.
alter table public.integration_config enable row level security;
revoke all on public.integration_config from anon;
drop policy if exists integration_config_admin_read on public.integration_config;
create policy integration_config_admin_read on public.integration_config for select to authenticated
  using (public.is_admin());

-- The secret keys (packages/shared/src/integrations/keys.ts). Anything else is refused.
create or replace function public.integration_secret_key_ok(p_key text) returns boolean
  language sql immutable set search_path = '' as $$
  select p_key = any (array[
    'WA_ACCESS_TOKEN', 'WA_APP_SECRET', 'WA_VERIFY_TOKEN', 'WA_CHAT_ACCESS_TOKEN', 'WA_CHAT_APP_SECRET',
    'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET', 'EXPO_ACCESS_TOKEN'
  ]);
$$;

-- Create or replace one secret. Never returns or logs the value.
create or replace function public.integration_secret_set(p_key text, p_value text) returns void
  language plpgsql security definer set search_path = '' as $$
declare
  existing uuid;
begin
  if not public.integration_secret_key_ok(p_key) then
    raise exception 'unknown integration secret key' using errcode = '22023';
  end if;
  if p_value is null or btrim(p_value) = '' or octet_length(p_value) > 4096 then
    raise exception 'invalid integration secret value' using errcode = '22023';
  end if;
  select id into existing from vault.secrets where name = 'integration:' || p_key;
  if existing is null then
    perform vault.create_secret(p_value, 'integration:' || p_key, 'Integration config (admin, /admin/settings)');
  else
    perform vault.update_secret(existing, p_value);
  end if;
end;
$$;

-- Remove one secret: the env value applies again. True when there was one.
create or replace function public.integration_secret_clear(p_key text) returns boolean
  language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  if not public.integration_secret_key_ok(p_key) then
    raise exception 'unknown integration secret key' using errcode = '22023';
  end if;
  delete from vault.secrets where name = 'integration:' || p_key;
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

-- The decrypted values, for the API's in-memory overlay only (service role).
create or replace function public.integration_secrets_read() returns table (key text, value text)
  language sql security definer set search_path = '' as $$
  select substr(s.name, length('integration:') + 1), s.decrypted_secret
  from vault.decrypted_secrets s
  where s.name like 'integration:%'
    and public.integration_secret_key_ok(substr(s.name, length('integration:') + 1));
$$;

-- Which secrets are set and when: NO values (the admin form's status chips).
create or replace function public.integration_secrets_status() returns table (key text, updated_at timestamptz)
  language sql security definer set search_path = '' as $$
  select substr(s.name, length('integration:') + 1), s.updated_at
  from vault.secrets s
  where s.name like 'integration:%'
    and public.integration_secret_key_ok(substr(s.name, length('integration:') + 1));
$$;

revoke execute on function public.integration_secret_key_ok(text) from public, anon, authenticated;
revoke execute on function public.integration_secret_set(text, text) from public, anon, authenticated;
revoke execute on function public.integration_secret_clear(text) from public, anon, authenticated;
revoke execute on function public.integration_secrets_read() from public, anon, authenticated;
revoke execute on function public.integration_secrets_status() from public, anon, authenticated;
grant execute on function public.integration_secret_key_ok(text) to service_role;
grant execute on function public.integration_secret_set(text, text) to service_role;
grant execute on function public.integration_secret_clear(text) to service_role;
grant execute on function public.integration_secrets_read() to service_role;
grant execute on function public.integration_secrets_status() to service_role;
