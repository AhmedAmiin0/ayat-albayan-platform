import { describe, expect, it } from 'vitest';
import { INTEGRATION_GROUPS, integrationDef } from './keys.js';

describe('GIPHY in «التكاملات» (owner 2026-11-01: GIFs in the chat)', () => {
  it('its key is a Vault secret in a group of its own, before Stripe', () => {
    expect(integrationDef('GIPHY_API_KEY')).toMatchObject({
      group: 'giphy',
      secret: true,
      i18n: 'integrations.keys.GIPHY_API_KEY',
    });
    expect(INTEGRATION_GROUPS.indexOf('giphy')).toBe(INTEGRATION_GROUPS.indexOf('stripe') - 1);
  });
});
