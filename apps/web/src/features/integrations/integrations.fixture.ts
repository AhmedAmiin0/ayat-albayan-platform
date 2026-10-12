import { INTEGRATION_KEYS, type IntegrationConfigItem } from '@ab/shared';

// Test fixture (not app code): GET /settings/integrations with a few keys set.

const AT = '2026-10-12T08:00:00Z';
const SET: Partial<Record<string, Partial<IntegrationConfigItem>>> = {
  WA_API_BASE: { value: 'http://localhost:4010', source: 'env', set: true },
  WA_WABA_ID: { value: 'db-waba', source: 'db', set: true, updated_at: AT },
  WA_ACCESS_TOKEN: { source: 'db', set: true, updated_at: AT },
  WA_APP_SECRET: { source: 'env', set: true },
};

export function integrationItems(): IntegrationConfigItem[] {
  return INTEGRATION_KEYS.map(({ key, group, secret }) => ({
    key,
    group,
    secret,
    value: null,
    set: false,
    source: 'unset' as const,
    updated_at: null,
    ...SET[key],
  }));
}
