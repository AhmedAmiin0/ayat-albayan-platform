import { INTEGRATION_KEYS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { integrationItems } from './integration-config.view';

const AT = '2026-10-12T08:00:00Z';

describe('integrationItems (GET /settings/integrations)', () => {
  it('every registry key, with its source: db over env over unset', () => {
    const items = integrationItems({
      plain: [{ key: 'WA_WABA_ID', value: 'db-waba', updated_at: AT }, { key: 'WA_APP_ID', value: ' ', updated_at: AT }],
      secrets: [{ key: 'WA_APP_SECRET', updated_at: AT }],
      env: { WA_WABA_ID: 'env-waba', WA_APP_ID: 'env-app', WA_API_VERSION: 'v21.0', WA_ACCESS_TOKEN: 'env-token-SENTINEL' },
    });
    expect(items.map((i) => i.key)).toEqual(INTEGRATION_KEYS.filter((d) => d.group !== 'stripe').map((d) => d.key));
    const by = Object.fromEntries(items.map((i) => [i.key, i]));
    expect(by['WA_WABA_ID']).toMatchObject({ value: 'db-waba', source: 'db', set: true, updated_at: AT });
    expect(by['WA_APP_ID']).toMatchObject({ value: 'env-app', source: 'env', updated_at: null });
    expect(by['WA_APP_SECRET']).toMatchObject({ value: null, source: 'db', set: true, secret: true, updated_at: AT });
    expect(by['WA_ACCESS_TOKEN']).toMatchObject({ value: null, source: 'env', set: true });
    expect(by['LIVEKIT_URL']).toMatchObject({ value: null, source: 'unset', set: false });
  });

  it('never carries a secret value, from env or anywhere', () => {
    const env = Object.fromEntries(INTEGRATION_KEYS.map((d) => [d.key, `SENTINEL-${d.key}`]));
    const json = JSON.stringify(integrationItems({ plain: [], secrets: [], env }));
    for (const d of INTEGRATION_KEYS.filter((k) => k.secret)) expect(json).not.toContain(`SENTINEL-${d.key}`);
  });

  it.each(['test', 'live'])('lists the Stripe group only on a server with FEATURE_STRIPE (here %s, docs/30)', (mode) => {
    const stripeKeys = (env: NodeJS.ProcessEnv) =>
      integrationItems({ plain: [], secrets: [{ key: 'STRIPE_API_KEY', updated_at: AT }], env }).filter((i) => i.group === 'stripe');
    expect(stripeKeys({})).toEqual([]);
    expect(stripeKeys({ FEATURE_STRIPE: '1' })).toEqual([]);
    const on = stripeKeys({ FEATURE_STRIPE: mode, STRIPE_ENABLED: 'true' });
    expect(on.map((i) => i.key)).toEqual(['STRIPE_ENABLED', 'STRIPE_API_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_MAX_DISCOUNT_PCT']);
    expect(on.map((i) => i.set)).toEqual([true, true, false, false]);
    expect(on[0]).toMatchObject({ value: 'true', source: 'env' });
  });
});
