import type { Env } from '../../config/env/env';

type IntegrationRefreshEnv = Pick<Env, 'INTEGRATION_CONFIG_FROM_DB' | 'INTEGRATION_REFRESH_MS' | 'SETTINGS_CACHE_MS'>;

/**
 * How often IntegrationConfigService re-reads the database's integration values, in ms.
 * INTEGRATION_REFRESH_MS when set, else SETTINGS_CACHE_MS (the period before the key existed, so an
 * unset key changes nothing, e2e's 0 included). null = INTEGRATION_CONFIG_FROM_DB=false: env only,
 * the database is never read for it.
 */
export function integrationRefreshMs(env: IntegrationRefreshEnv): number | null {
  if (!env.INTEGRATION_CONFIG_FROM_DB) return null;
  return env.INTEGRATION_REFRESH_MS ?? env.SETTINGS_CACHE_MS;
}
