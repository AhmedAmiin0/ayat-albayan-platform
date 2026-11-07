-- MinIO object storage in «التكاملات» (owner 2026-11-06, docs/45). The storage keys are plain
-- integration_config rows (STORAGE_DRIVER, MINIO_ENDPOINT, MINIO_PUBLIC_URL, MINIO_REGION,
-- MINIO_BUCKET_PREFIX, MINIO_ACCESS_KEY: the table's key check already admits them); the secret key
-- joins the Vault allow-list (Vault name integration:MINIO_SECRET_KEY).
--   * integration_secret_key_ok: re-created with the full list of migration 20261106000700 plus
--     MINIO_SECRET_KEY. Service role only, as before.
-- No new table, no data change: STORAGE_DRIVER has no row, so the API keeps writing to Supabase
-- Storage until an admin switches it (the cut-over). Expand-only and re-runnable.

set local lock_timeout = '5s';

create or replace function public.integration_secret_key_ok(p_key text) returns boolean
  language sql immutable set search_path = '' as $$
  select p_key = any (array[
    'WA_ACCESS_TOKEN', 'WA_APP_SECRET', 'WA_VERIFY_TOKEN', 'WA_CHAT_ACCESS_TOKEN', 'WA_CHAT_APP_SECRET',
    'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET', 'EXPO_ACCESS_TOKEN', 'WEB_PUSH_VAPID_PRIVATE_KEY',
    'KAPSO_API_KEY', 'KAPSO_WEBHOOK_SECRET', 'GOOGLE_CLIENT_SECRET',
    'WACRM_API_KEY', 'WACRM_WEBHOOK_SECRET', 'CALLS_TURN_SECRET',
    'STRIPE_API_KEY', 'STRIPE_WEBHOOK_SECRET', 'GIPHY_API_KEY',
    'EVOLUTION_API_KEY', 'MINIO_SECRET_KEY'
  ]);
$$;

revoke execute on function public.integration_secret_key_ok(text) from public, anon, authenticated;
grant execute on function public.integration_secret_key_ok(text) to service_role;
