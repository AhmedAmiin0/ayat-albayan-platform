import { describe, expect, it } from 'vitest';
import { loadEnv } from '../../config/env/env';
import { integrationRefreshMs } from './integration-refresh';

const base = { INTEGRATION_CONFIG_FROM_DB: true, INTEGRATION_REFRESH_MS: undefined, SETTINGS_CACHE_MS: 30_000 };

describe('integrationRefreshMs: the integration config reload period', () => {
  it('unset INTEGRATION_REFRESH_MS: SETTINGS_CACHE_MS but at least a minute (30 s → 60 s: half the reads); e2e 0 stays 0', () => {
    expect(integrationRefreshMs(base)).toBe(60_000);
    expect(integrationRefreshMs({ ...base, SETTINGS_CACHE_MS: 120_000 })).toBe(120_000);
    expect(integrationRefreshMs({ ...base, SETTINGS_CACHE_MS: 0 })).toBe(0);
  });

  it('INTEGRATION_REFRESH_MS wins when set, 0 included', () => {
    expect(integrationRefreshMs({ ...base, INTEGRATION_REFRESH_MS: 120_000 })).toBe(120_000);
    expect(integrationRefreshMs({ ...base, INTEGRATION_REFRESH_MS: 0 })).toBe(0);
  });

  it('INTEGRATION_CONFIG_FROM_DB=false: null (env only), whatever the periods', () => {
    expect(integrationRefreshMs({ ...base, INTEGRATION_CONFIG_FROM_DB: false })).toBeNull();
    expect(integrationRefreshMs({ ...base, INTEGRATION_CONFIG_FROM_DB: false, INTEGRATION_REFRESH_MS: 5_000 })).toBeNull();
  });

  it('reads the env schema: a blank INTEGRATION_REFRESH_MS is unset, a number is coerced', () => {
    const src = { SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_SERVICE_ROLE_KEY: 'k', SETTINGS_CACHE_MS: '0' };
    expect(integrationRefreshMs(loadEnv({ ...src, INTEGRATION_REFRESH_MS: '' }))).toBe(0);
    expect(integrationRefreshMs(loadEnv({ ...src, INTEGRATION_REFRESH_MS: '60000' }))).toBe(60_000);
    expect(integrationRefreshMs(loadEnv({ ...src, INTEGRATION_CONFIG_FROM_DB: 'false' }))).toBeNull();
  });
});
