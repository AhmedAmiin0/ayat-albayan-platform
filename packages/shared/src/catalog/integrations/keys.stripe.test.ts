import { describe, expect, it } from 'vitest';
import { integrationSecretCheck, integrationValuesSchema, integrationValueValid } from './checks.js';
import { INTEGRATION_GROUPS, integrationDef, integrationEnum } from './keys.js';

// Stripe in «التكاملات» (owner 2026-11-01, docs/30): one switch, two Vault secrets, the cap.
const issue = (key: 'STRIPE_API_KEY' | 'STRIPE_WEBHOOK_SECRET', value: string) =>
  integrationSecretCheck(key).safeParse(value).error?.issues[0]?.message ?? null;

describe('the stripe group', () => {
  it('holds the switch and the cap (plain) and the two secrets, last on the page', () => {
    expect(INTEGRATION_GROUPS.at(-1)).toBe('stripe');
    expect(integrationDef('STRIPE_ENABLED')).toMatchObject({ group: 'stripe', secret: false });
    expect(integrationDef('STRIPE_MAX_DISCOUNT_PCT')).toMatchObject({ group: 'stripe', secret: false });
    expect(integrationDef('STRIPE_API_KEY')).toMatchObject({ group: 'stripe', secret: true });
    expect(integrationDef('STRIPE_WEBHOOK_SECRET')).toMatchObject({ group: 'stripe', secret: true });
  });

  it('the switch is a select whose default (first) choice is off', () => {
    expect(integrationEnum('STRIPE_ENABLED')).toEqual(['false', 'true']);
    expect(integrationValueValid('STRIPE_ENABLED', 'true')).toBe(true);
    expect(integrationValueValid('STRIPE_ENABLED', 'yes please')).toBe(false);
  });

  it('the cap is a percentage', () => {
    expect(integrationValueValid('STRIPE_MAX_DISCOUNT_PCT', '15')).toBe(true);
    expect(integrationValueValid('STRIPE_MAX_DISCOUNT_PCT', '12.5')).toBe(true);
    expect(integrationValueValid('STRIPE_MAX_DISCOUNT_PCT', '101')).toBe(false);
    expect(integrationValueValid('STRIPE_MAX_DISCOUNT_PCT', 'ten')).toBe(false);
    expect(integrationValuesSchema.safeParse({ values: { STRIPE_MAX_DISCOUNT_PCT: '-1' } }).success).toBe(false);
  });

  it('takes sandbox keys only: a live key, a publishable key or junk is refused', () => {
    expect(issue('STRIPE_API_KEY', 'rk_test_51AbcXYZ')).toBeNull();
    expect(issue('STRIPE_API_KEY', 'sk_test_51AbcXYZ')).toBeNull();
    for (const live of ['rk_live_51AbcXYZ', 'sk_live_51AbcXYZ', 'pk_test_51AbcXYZ', 'rk_test_', 'nope']) {
      expect(issue('STRIPE_API_KEY', live)).toBe('stripe_live_key_refused');
    }
  });

  it('the webhook secret starts with whsec_; other secrets stay free text', () => {
    expect(issue('STRIPE_WEBHOOK_SECRET', 'whsec_abc123')).toBeNull();
    expect(issue('STRIPE_WEBHOOK_SECRET', 'abc123')).toBe('invalid_value');
    expect(integrationSecretCheck('WA_ACCESS_TOKEN').safeParse('anything at all').success).toBe(true);
  });
});
