import { describe, expect, it } from 'vitest';
import {
  INTEGRATION_GROUPS,
  INTEGRATION_KEYS,
  INTEGRATION_PLAIN_KEYS,
  INTEGRATION_SECRET_KEYS,
  integrationDef,
  isIntegrationKey,
  isIntegrationPlainKey,
  isIntegrationSecretKey,
} from './keys.js';

describe('integration keys registry', () => {
  it('lists every plain and secret key once, grouped in page order', () => {
    expect(INTEGRATION_KEYS).toHaveLength(INTEGRATION_PLAIN_KEYS.length + INTEGRATION_SECRET_KEYS.length);
    expect(new Set(INTEGRATION_KEYS.map((d) => d.key)).size).toBe(INTEGRATION_KEYS.length);
    const order = INTEGRATION_KEYS.map((d) => INTEGRATION_GROUPS.indexOf(d.group));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('flags exactly the secret keys as secret', () => {
    expect(INTEGRATION_KEYS.filter((d) => d.secret).map((d) => d.key).sort()).toEqual([...INTEGRATION_SECRET_KEYS].sort());
    expect(integrationDef('WA_ACCESS_TOKEN')).toMatchObject({ group: 'wa_notifications', secret: true, i18n: 'integrations.keys.WA_ACCESS_TOKEN' });
    expect(integrationDef('FX_API_URL')).toMatchObject({ group: 'fx', secret: false });
  });

  it('keys match the table check and the guards tell plain from secret', () => {
    for (const { key } of INTEGRATION_KEYS) expect(key).toMatch(/^[A-Z][A-Z0-9_]{2,63}$/);
    expect(isIntegrationSecretKey('WA_APP_SECRET')).toBe(true);
    expect(isIntegrationPlainKey('WA_APP_SECRET')).toBe(false);
    expect(isIntegrationPlainKey('WA_API_BASE')).toBe(true);
    expect(isIntegrationKey('SUPABASE_SERVICE_ROLE_KEY')).toBe(false);
    expect(isIntegrationKey('MESSAGING_ENABLED')).toBe(false);
  });

  it('never registers a key that must stay in env', () => {
    const envOnly = ['PORT', 'WEB_ORIGIN', 'SUPABASE_URL', 'SUPABASE_JWT_SECRET', 'SUPABASE_SERVICE_ROLE_KEY', 'SETTINGS_CACHE_MS',
      'MESSAGE_SENDER_POLL_MS', 'AUTH_PASSWORD_MIN_LENGTH', 'FEEDBACK_TOKEN_SECRET', 'MESSAGING_ENABLED'];
    expect(envOnly.filter(isIntegrationKey)).toEqual([]);
  });
});
