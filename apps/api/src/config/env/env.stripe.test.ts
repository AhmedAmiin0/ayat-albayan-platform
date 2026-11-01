import { describe, expect, it } from 'vitest';
import { loadEnv, validOverlay } from './env';
import { stripeFeatureOn, stripeReady } from './env.stripe';

const BASE = { SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_SERVICE_ROLE_KEY: 'k' };
const KEYS = { STRIPE_API_KEY: 'rk_test_51Abc', STRIPE_WEBHOOK_SECRET: 'whsec_abc123' };

describe('env: Stripe (docs/30, test build only)', () => {
  it('only FEATURE_STRIPE=test turns the module on; never a DB value', () => {
    expect(stripeFeatureOn({})).toBe(false);
    expect(stripeFeatureOn({ FEATURE_STRIPE: '1' })).toBe(false);
    expect(stripeFeatureOn({ FEATURE_STRIPE: 'live' })).toBe(false);
    expect(stripeFeatureOn({ FEATURE_STRIPE: 'test' })).toBe(true);
  });

  it('«الدفع الإلكتروني» is off by default; the cap is unset = no cap', () => {
    const env = loadEnv(BASE);
    expect(env.STRIPE_ENABLED).toBe(false);
    expect(env.STRIPE_MAX_DISCOUNT_PCT).toBeUndefined();
    expect(loadEnv({ ...BASE, STRIPE_ENABLED: '', STRIPE_MAX_DISCOUNT_PCT: '' }).STRIPE_ENABLED).toBe(false);
    expect(loadEnv({ ...BASE, STRIPE_MAX_DISCOUNT_PCT: '15' }).STRIPE_MAX_DISCOUNT_PCT).toBe(15);
  });

  it('ready = the switch on AND both keys saved', () => {
    expect(stripeReady(loadEnv({ ...BASE, ...KEYS }))).toBe(false);
    expect(stripeReady(loadEnv({ ...BASE, ...KEYS, STRIPE_ENABLED: 'true' }))).toBe(true);
    expect(stripeReady(loadEnv({ ...BASE, STRIPE_ENABLED: 'true', STRIPE_API_KEY: KEYS.STRIPE_API_KEY }))).toBe(false);
    expect(stripeReady(loadEnv({ ...BASE, STRIPE_ENABLED: 'true', STRIPE_WEBHOOK_SECRET: 'whsec_x' }))).toBe(false);
  });

  it('a live key in env fails the boot; one saved in the database is dropped by name only', () => {
    expect(() => loadEnv({ ...BASE, STRIPE_API_KEY: 'sk_live_51Abc' })).toThrow();
    const bad: string[] = [];
    const overlay = validOverlay({ STRIPE_API_KEY: 'rk_live_51Abc', STRIPE_WEBHOOK_SECRET: 'whsec_ok', STRIPE_ENABLED: 'true' }, (k) => bad.push(k));
    expect(overlay).toEqual({ STRIPE_WEBHOOK_SECRET: 'whsec_ok', STRIPE_ENABLED: 'true' });
    expect(bad).toEqual(['STRIPE_API_KEY']);
  });
});
