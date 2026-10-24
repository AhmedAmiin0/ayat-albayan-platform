-- The crm WhatsApp driver (owner 2026-10-25: «add one driver for the crm», «deal with the crm as api»;
-- docs/19-messaging-drivers.md «crm driver»): a line may send through the academy's self-hosted WA CRM's
-- public REST API.
--
-- 1. integration_secret_key_ok: the latest list (migration 610) plus WACRM_API_KEY (the CRM's Bearer key)
--    and WACRM_WEBHOOK_SECRET (the HMAC key of POST /webhooks/wacrm), both in Vault via «التكاملات». The
--    plain WACRM_API_BASE needs nothing here: integration_config accepts any registry-shaped key and the
--    API validates values.
-- 2. wa_numbers.provider accepts 'crm' (module mode: a crm number sends with WACRM_API_BASE / WACRM_API_KEY,
--    like a kapso number with Kapso's project key; its phone_number_id only names it).
--
-- Expand-only and idempotent: no row is written, no configured value is changed (WA_PROVIDER stays as it is).

set local lock_timeout = '5s';

create or replace function public.integration_secret_key_ok(p_key text) returns boolean
  language sql immutable set search_path = '' as $$
  select p_key = any (array[
    'WA_ACCESS_TOKEN', 'WA_APP_SECRET', 'WA_VERIFY_TOKEN', 'WA_CHAT_ACCESS_TOKEN', 'WA_CHAT_APP_SECRET',
    'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET', 'EXPO_ACCESS_TOKEN', 'WEB_PUSH_VAPID_PRIVATE_KEY',
    'KAPSO_API_KEY', 'KAPSO_WEBHOOK_SECRET', 'GOOGLE_CLIENT_SECRET',
    'WACRM_API_KEY', 'WACRM_WEBHOOK_SECRET'
  ]);
$$;

revoke execute on function public.integration_secret_key_ok(text) from public, anon, authenticated;
grant execute on function public.integration_secret_key_ok(text) to service_role;

-- Widen the provider check (migration 620 named it by default). NOT VALID + VALIDATE: the check of the
-- existing rows takes only a SHARE UPDATE EXCLUSIVE lock (the table holds a handful of rows anyway).
alter table public.wa_numbers drop constraint if exists wa_numbers_provider_check;
alter table public.wa_numbers add constraint wa_numbers_provider_check
  check (provider in ('meta', 'kapso', 'crm')) not valid;
alter table public.wa_numbers validate constraint wa_numbers_provider_check;

-- MANUAL ROLLBACK (only after the code rollback; switch any line / number off crm and clear the two Vault
-- secrets first):
--   select public.integration_secret_clear('WACRM_API_KEY');
--   select public.integration_secret_clear('WACRM_WEBHOOK_SECRET');
--   update public.wa_numbers set provider = 'meta', enabled = false where provider = 'crm';
--   alter table public.wa_numbers drop constraint wa_numbers_provider_check;
--   alter table public.wa_numbers add constraint wa_numbers_provider_check check (provider in ('meta', 'kapso'));
--   (then re-run migration 610's integration_secret_key_ok)
