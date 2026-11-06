-- The Evolution WhatsApp driver (owner 2026-11-06; docs/19-messaging-drivers.md «Evolution driver»): a
-- NUMBER may send through a self-hosted Evolution API instance (Baileys = WhatsApp Web, or Meta's Cloud
-- API). Default OFF: no row is switched, every existing number keeps its provider.
--
-- 1. wa_numbers.provider accepts 'evolution' (the instance name is the row's phone_number_id).
-- 2. wa_numbers gains the instance's engine (evolution_mode), the Baileys safety switch
--    (evolution_auto_sends, default false = staff chat only) and the last state Evolution reported by
--    webhook (evolution_state / evolution_state_at). All nullable or defaulted: metadata-only adds.
-- 3. A number's Vault secrets accept 'evolution_token' (wa_number:<id>:evolution_token).
-- 4. integration_secret_key_ok: the full list of migration 998 plus EVOLUTION_API_KEY (the server's
--    global key, Vault name integration:EVOLUTION_API_KEY). EVOLUTION_API_BASE is a plain
--    integration_config key (validated by the API); the pacing gap is per number
--    (evolution_config.limits.gap_ms, default 3000).
-- 5. wa_numbers.evolution_config (every Evolution option of the number, no secret; zod-validated by the
--    API, an object here) and evolution_sync (the last push read back). The Cloud access token and the
--    proxy password are number secrets (evolution_cloud_token, evolution_proxy_password).
-- 6. messages.sent_as_text: a template the Evolution driver sent as plain text (Baileys has no templates).
-- 7. wa_numbers.evolution_enabled_at: when the number was last switched on (a trigger sets it on
--    the off → on edge only; state, sync and health writes never touch it). The ERROR auto-disable
--    ignores errors of sends made before it, so a replayed webhook never undoes an admin's enable.
-- 8. wa_number_delete removes every Vault entry of the number (wa_number:<id>:%), the Evolution
--    secrets included.
--
-- Expand-only and idempotent. RLS is unchanged (no new table; wa_numbers and messages keep theirs).

set local lock_timeout = '5s';

alter table public.wa_numbers drop constraint if exists wa_numbers_provider_check;
alter table public.wa_numbers add constraint wa_numbers_provider_check
  check (provider in ('meta', 'kapso', 'crm', 'evolution')) not valid;
alter table public.wa_numbers validate constraint wa_numbers_provider_check;

alter table public.wa_numbers add column if not exists evolution_mode text;
alter table public.wa_numbers add column if not exists evolution_auto_sends boolean not null default false;
alter table public.wa_numbers add column if not exists evolution_state text;
alter table public.wa_numbers add column if not exists evolution_state_at timestamptz;

alter table public.wa_numbers add column if not exists evolution_config jsonb not null default '{}'::jsonb;
alter table public.wa_numbers add column if not exists evolution_sync jsonb;

alter table public.wa_numbers drop constraint if exists wa_numbers_evolution_config_object;
alter table public.wa_numbers add constraint wa_numbers_evolution_config_object
  check (jsonb_typeof(evolution_config) = 'object') not valid;
alter table public.wa_numbers validate constraint wa_numbers_evolution_config_object;

alter table public.wa_numbers drop constraint if exists wa_numbers_evolution_mode_check;
alter table public.wa_numbers add constraint wa_numbers_evolution_mode_check
  check (evolution_mode is null or evolution_mode in ('baileys', 'cloud')) not valid;
alter table public.wa_numbers validate constraint wa_numbers_evolution_mode_check;

-- An evolution number always names its engine; any other provider carries none.
alter table public.wa_numbers drop constraint if exists wa_numbers_evolution_mode_needed;
alter table public.wa_numbers add constraint wa_numbers_evolution_mode_needed
  check ((provider = 'evolution') = (evolution_mode is not null)) not valid;
alter table public.wa_numbers validate constraint wa_numbers_evolution_mode_needed;

alter table public.wa_numbers drop constraint if exists wa_numbers_evolution_state_check;
alter table public.wa_numbers add constraint wa_numbers_evolution_state_check
  check (evolution_state is null or evolution_state in ('open', 'connecting', 'close', 'refused')) not valid;
alter table public.wa_numbers validate constraint wa_numbers_evolution_state_check;

alter table public.messages add column if not exists sent_as_text boolean not null default false;

alter table public.wa_numbers add column if not exists evolution_enabled_at timestamptz;

-- Set only when the row becomes enabled (insert enabled, or off → on); every other write keeps it.
create or replace function public.wa_numbers_evolution_enabled_at() returns trigger
  language plpgsql set search_path = '' as $$
begin
  if new.enabled and (tg_op = 'INSERT' or not old.enabled) then
    new.evolution_enabled_at := now();
  end if;
  return new;
end;
$$;

revoke execute on function public.wa_numbers_evolution_enabled_at() from public, anon, authenticated;

drop trigger if exists wa_numbers_evolution_enabled_at on public.wa_numbers;
create trigger wa_numbers_evolution_enabled_at
  before insert or update of enabled on public.wa_numbers
  for each row execute function public.wa_numbers_evolution_enabled_at();

create or replace function public.wa_number_secret_name_ok(p_name text) returns boolean
  language sql immutable set search_path = '' as $$
  select p_name = any (array[
    'access_token', 'app_secret', 'evolution_token', 'evolution_cloud_token', 'evolution_proxy_password'
  ]);
$$;

-- One number's decrypted values, for the API's in-memory line config only (service role).
create or replace function public.wa_number_secret_read(p_id uuid) returns table (name text, value text)
  language sql stable security definer set search_path = '' as $$
  select split_part(s.name, ':', 3), s.decrypted_secret
  from vault.decrypted_secrets s
  where p_id is not null
    and exists (select 1 from public.wa_numbers n where n.id = p_id)
    and s.name in (
      'wa_number:' || p_id::text || ':access_token',
      'wa_number:' || p_id::text || ':app_secret',
      'wa_number:' || p_id::text || ':evolution_token',
      'wa_number:' || p_id::text || ':evolution_cloud_token',
      'wa_number:' || p_id::text || ':evolution_proxy_password'
    );
$$;

revoke execute on function public.wa_number_secret_name_ok(text) from public, anon, authenticated;
revoke execute on function public.wa_number_secret_read(uuid) from public, anon, authenticated;
grant execute on function public.wa_number_secret_name_ok(text) to service_role;
grant execute on function public.wa_number_secret_read(uuid) to service_role;

create or replace function public.integration_secret_key_ok(p_key text) returns boolean
  language sql immutable set search_path = '' as $$
  select p_key = any (array[
    'WA_ACCESS_TOKEN', 'WA_APP_SECRET', 'WA_VERIFY_TOKEN', 'WA_CHAT_ACCESS_TOKEN', 'WA_CHAT_APP_SECRET',
    'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET', 'EXPO_ACCESS_TOKEN', 'WEB_PUSH_VAPID_PRIVATE_KEY',
    'KAPSO_API_KEY', 'KAPSO_WEBHOOK_SECRET', 'GOOGLE_CLIENT_SECRET',
    'WACRM_API_KEY', 'WACRM_WEBHOOK_SECRET', 'CALLS_TURN_SECRET',
    'STRIPE_API_KEY', 'STRIPE_WEBHOOK_SECRET', 'GIPHY_API_KEY',
    'EVOLUTION_API_KEY'
  ]);
$$;

revoke execute on function public.integration_secret_key_ok(text) from public, anon, authenticated;
grant execute on function public.integration_secret_key_ok(text) to service_role;

-- Delete a DISABLED number and EVERY Vault entry of it (access_token, app_secret and the Evolution
-- secrets: any wa_number:<id>:<name>). False = missing or still enabled.
create or replace function public.wa_number_delete(p_id uuid) returns boolean
  language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  delete from public.wa_numbers where id = p_id and not enabled;
  get diagnostics n = row_count;
  if n = 0 then
    return false;
  end if;
  delete from vault.secrets where name like 'wa_number:' || p_id::text || ':%';
  return true;
end;
$$;

revoke execute on function public.wa_number_delete(uuid) from public, anon, authenticated;
grant execute on function public.wa_number_delete(uuid) to service_role;

-- MANUAL ROLLBACK (only after the code rollback, and after moving every evolution number off it):
--   update public.wa_numbers set provider = 'meta', enabled = false, evolution_mode = null
--     where provider = 'evolution';
--   alter table public.wa_numbers drop constraint wa_numbers_evolution_mode_needed;
--   alter table public.wa_numbers drop constraint wa_numbers_evolution_mode_check;
--   alter table public.wa_numbers drop constraint wa_numbers_evolution_state_check;
--   alter table public.wa_numbers drop constraint wa_numbers_evolution_config_object;
--   alter table public.wa_numbers drop column evolution_config, drop column evolution_sync;
--   alter table public.wa_numbers drop column evolution_mode, drop column evolution_auto_sends,
--     drop column evolution_state, drop column evolution_state_at;
--   alter table public.messages drop column sent_as_text;
--   drop trigger wa_numbers_evolution_enabled_at on public.wa_numbers;
--   drop function public.wa_numbers_evolution_enabled_at();
--   alter table public.wa_numbers drop column evolution_enabled_at;
--   (then re-create wa_numbers_provider_check with 'meta', 'kapso', 'crm', and the functions of 621 / 998;
--   wa_number_delete of 621 is safe to keep: it only deletes more Vault entries of a deleted number)
