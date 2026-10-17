-- WhatsApp drivers (owner 2026-10-17: «a notification/messaging engine: one driver using a third
-- party like Kapso, the other using Meta native APIs»; docs/19-messaging-drivers.md).
--
-- integration_secret_key_ok: migration 380's full list plus KAPSO_API_KEY (the X-API-Key of the
-- kapso driver) and KAPSO_WEBHOOK_SECRET (the HMAC key of POST /webhooks/kapso), both in Vault via
-- «التكاملات». The plain keys (WA_PROVIDER, WA_CHAT_PROVIDER, KAPSO_API_BASE, KAPSO_API_VERSION) need
-- nothing here: integration_config accepts any registry-shaped key and the API validates values.
--
-- Idempotent: safe to run twice. Expand-only: the previous API never asks for the new keys.

set local lock_timeout = '5s';

create or replace function public.integration_secret_key_ok(p_key text) returns boolean
  language sql immutable set search_path = '' as $$
  select p_key = any (array[
    'WA_ACCESS_TOKEN', 'WA_APP_SECRET', 'WA_VERIFY_TOKEN', 'WA_CHAT_ACCESS_TOKEN', 'WA_CHAT_APP_SECRET',
    'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET', 'EXPO_ACCESS_TOKEN', 'WEB_PUSH_VAPID_PRIVATE_KEY',
    'KAPSO_API_KEY', 'KAPSO_WEBHOOK_SECRET'
  ]);
$$;

revoke execute on function public.integration_secret_key_ok(text) from public, anon, authenticated;
grant execute on function public.integration_secret_key_ok(text) to service_role;

-- MANUAL ROLLBACK (only after the code rollback; clear the two Vault secrets first):
--   select public.integration_secret_clear('KAPSO_API_KEY');
--   select public.integration_secret_clear('KAPSO_WEBHOOK_SECRET');
--   (then re-run migration 380's integration_secret_key_ok)
