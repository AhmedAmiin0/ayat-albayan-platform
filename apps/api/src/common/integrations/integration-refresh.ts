import type { Env } from '../../config/env/env';

type IntegrationRefreshEnv = Pick<Env, 'INTEGRATION_CONFIG_FROM_DB' | 'INTEGRATION_REFRESH_MS' | 'SETTINGS_CACHE_MS'>;

/** Unset INTEGRATION_REFRESH_MS: at least this (owner 2026-10-27: two round trips every 30 s before). */
const DEFAULT_INTEGRATION_REFRESH_MS = 60_000;

/**
 * How often IntegrationConfigService (and NumbersConfig) re-read the database's integration values, in
 * ms. INTEGRATION_REFRESH_MS when set; else SETTINGS_CACHE_MS, but at least a minute (an admin save in
 * this API reloads at once, so the period only bounds another writer, e.g. config-import-env), and e2e's
 * SETTINGS_CACHE_MS 0 stays 0. null = INTEGRATION_CONFIG_FROM_DB=false: env only, never read.
 */
export function integrationRefreshMs(env: IntegrationRefreshEnv): number | null {
  if (!env.INTEGRATION_CONFIG_FROM_DB) return null;
  if (env.INTEGRATION_REFRESH_MS !== undefined) return env.INTEGRATION_REFRESH_MS;
  return env.SETTINGS_CACHE_MS === 0 ? 0 : Math.max(env.SETTINGS_CACHE_MS, DEFAULT_INTEGRATION_REFRESH_MS);
}
