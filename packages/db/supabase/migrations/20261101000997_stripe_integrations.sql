-- Stripe in «التكاملات» (owner 2026-11-01: «add stripe to integrations», «add option to toggle online
-- payments on and off»; docs/30). One mechanism for every integration: the Stripe payment links (TEST
-- BUILD ONLY) now read their keys like WhatsApp, LiveKit or Google do, through the integration overlay.
--   * integration_secret_key_ok: re-created with the full list, the two Stripe secrets added
--     (STRIPE_API_KEY, STRIPE_WEBHOOK_SECRET; Vault names integration:STRIPE_*). The API refuses a live
--     key at PUT /settings/integrations/secrets/:key and drops one saved by hand from its overlay.
--   * The secrets saved on the old screen (Vault stripe:api_key / stripe:webhook_secret) are COPIED to
--     integration:STRIPE_API_KEY / integration:STRIPE_WEBHOOK_SECRET inside the database: the values
--     go from vault.decrypted_secrets to vault.create_secret, never selected, returned or logged. Only
--     a value of the right shape is copied (a sandbox key, a whsec_ secret), and only when the new name
--     has none yet, so a key saved in «التكاملات» already wins and a second run copies nothing.
--   * The switch stripe_settings.stripe_enabled and the cap stripe_settings.max_discount_pct are copied
--     to integration_config STRIPE_ENABLED / STRIPE_MAX_DISCOUNT_PCT (on conflict do nothing: idempotent,
--     a value saved in «التكاملات» stays). A missing STRIPE_ENABLED row reads as off (the default).
-- Expand-only: nothing is dropped or deleted. The old stripe:* secrets, the stripe_secret_* functions and
-- the two stripe_settings columns are no longer read by the API and stay until a later cleanup.

set local lock_timeout = '5s';

create or replace function public.integration_secret_key_ok(p_key text) returns boolean
  language sql immutable set search_path = '' as $$
  select p_key = any (array[
    'WA_ACCESS_TOKEN', 'WA_APP_SECRET', 'WA_VERIFY_TOKEN', 'WA_CHAT_ACCESS_TOKEN', 'WA_CHAT_APP_SECRET',
    'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET', 'EXPO_ACCESS_TOKEN', 'WEB_PUSH_VAPID_PRIVATE_KEY',
    'KAPSO_API_KEY', 'KAPSO_WEBHOOK_SECRET', 'GOOGLE_CLIENT_SECRET',
    'WACRM_API_KEY', 'WACRM_WEBHOOK_SECRET', 'CALLS_TURN_SECRET',
    'STRIPE_API_KEY', 'STRIPE_WEBHOOK_SECRET'
  ]);
$$;

revoke execute on function public.integration_secret_key_ok(text) from public, anon, authenticated;
grant execute on function public.integration_secret_key_ok(text) to service_role;

do $$
declare
  m record;
begin
  for m in
    select v.new_key, s.decrypted_secret as value
    from (values
      ('stripe:api_key', 'STRIPE_API_KEY', '^(rk|sk)_test_[A-Za-z0-9]+$'),
      ('stripe:webhook_secret', 'STRIPE_WEBHOOK_SECRET', '^whsec_[A-Za-z0-9+/=]+$')
    ) as v (old_name, new_key, shape)
    join vault.decrypted_secrets s on s.name = v.old_name
    where btrim(s.decrypted_secret) ~ v.shape
      and not exists (select 1 from vault.secrets t where t.name = 'integration:' || v.new_key)
  loop
    perform vault.create_secret(btrim(m.value), 'integration:' || m.new_key, 'Integration config (admin, /admin/settings)');
  end loop;
end;
$$;

insert into public.integration_config (key, value)
select 'STRIPE_ENABLED', s.stripe_enabled::text from public.stripe_settings s where s.id
on conflict (key) do nothing;

insert into public.integration_config (key, value)
select 'STRIPE_MAX_DISCOUNT_PCT', s.max_discount_pct::text from public.stripe_settings s
where s.id and s.max_discount_pct is not null
on conflict (key) do nothing;

comment on column public.stripe_settings.stripe_enabled is
  'No longer read (2026-11-01): the switch is integration_config STRIPE_ENABLED. Dropped in a later cleanup.';
comment on column public.stripe_settings.max_discount_pct is
  'No longer read (2026-11-01): the cap is integration_config STRIPE_MAX_DISCOUNT_PCT. Dropped in a later cleanup.';

-- MANUAL ROLLBACK (only after the code rollback, which reads stripe_settings and stripe:* again):
--   delete from public.integration_config where key in ('STRIPE_ENABLED', 'STRIPE_MAX_DISCOUNT_PCT');
--   select public.integration_secret_clear('STRIPE_API_KEY');
--   select public.integration_secret_clear('STRIPE_WEBHOOK_SECRET');
--   then re-create integration_secret_key_ok as in 20261026000740_wa_calls.sql.
