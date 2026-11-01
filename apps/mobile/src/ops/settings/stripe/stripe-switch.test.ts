import type { IntegrationConfigItem } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { stripeSwitch, switchNote, switchValues } from './stripe-switch';

const S = t.paymentLinks.settings;
const item = (key: IntegrationConfigItem['key'], over: Partial<IntegrationConfigItem> = {}): IntegrationConfigItem => ({
  key, group: 'stripe', secret: key !== 'STRIPE_ENABLED', value: null, set: false, source: 'unset', updated_at: null, ...over,
});

test('no Stripe key listed (a server without FEATURE_STRIPE): no switch', () => {
  expect(stripeSwitch([item('FX_API_URL')])).toBeNull();
});

test('off by default; on lists the keys it still lacks by their labels, never a value', () => {
  const off = stripeSwitch([item('STRIPE_ENABLED'), item('STRIPE_API_KEY'), item('STRIPE_WEBHOOK_SECRET')]);
  expect(off).toEqual({ on: false, missing: ['STRIPE_API_KEY', 'STRIPE_WEBHOOK_SECRET'] });
  expect(off && switchNote(off)).toBe(S.hint);
  const lacking = stripeSwitch([item('STRIPE_ENABLED', { value: 'true', set: true }), item('STRIPE_API_KEY', { set: true })]);
  expect(lacking?.missing).toEqual(['STRIPE_WEBHOOK_SECRET']);
  expect(lacking && switchNote(lacking)).toContain(t.integrations.keys.STRIPE_WEBHOOK_SECRET.label);
  const ready = stripeSwitch([
    item('STRIPE_ENABLED', { value: 'true' }),
    item('STRIPE_API_KEY', { set: true }),
    item('STRIPE_WEBHOOK_SECRET', { set: true }),
  ]);
  expect(ready && switchNote(ready)).toBe(S.ready);
});

test('reads the switch as the server does: «1» set in env is on', () => {
  expect(stripeSwitch([item('STRIPE_ENABLED', { value: '1', source: 'env', set: true })])?.on).toBe(true);
  expect(stripeSwitch([item('STRIPE_ENABLED', { value: 'false', set: true })])?.on).toBe(false);
});

test('the save sends the switch alone, as the web «التكاملات» does', () => {
  expect(switchValues(true)).toEqual({ values: { STRIPE_ENABLED: 'true' } });
  expect(switchValues(false)).toEqual({ values: { STRIPE_ENABLED: 'false' } });
});
