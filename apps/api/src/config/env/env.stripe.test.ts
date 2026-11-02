import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadEnv, validOverlay } from './env';
import { stripeFeatureOn, stripeKeyIsLive, stripeLiveAllowed, stripeReady } from './env.stripe';

const BASE = { SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_SERVICE_ROLE_KEY: 'k' };
const KEYS = { STRIPE_API_KEY: 'rk_test_51Abc', STRIPE_WEBHOOK_SECRET: 'whsec_abc123' };
/** The keys validOverlay keeps from a DB overlay with a live key, and the keys it drops. */
const overlayOf = (raw: Record<string, string>) => {
  const bad: string[] = [];
  return { kept: Object.keys(validOverlay(raw, (k) => bad.push(k))), bad };
};

afterEach(() => vi.unstubAllEnvs());

describe('env: Stripe (docs/30, FEATURE_STRIPE test or live)', () => {
  it('FEATURE_STRIPE=test or live turns the module on; only live allows live keys; never a DB value', () => {
    for (const off of [{}, { FEATURE_STRIPE: '1' }, { FEATURE_STRIPE: 'LIVE' }, { FEATURE_STRIPE: '' }]) {
      expect([stripeFeatureOn(off), stripeLiveAllowed(off)]).toEqual([false, false]);
    }
    expect([stripeFeatureOn({ FEATURE_STRIPE: 'test' }), stripeLiveAllowed({ FEATURE_STRIPE: 'test' })]).toEqual([true, false]);
    expect([stripeFeatureOn({ FEATURE_STRIPE: 'live' }), stripeLiveAllowed({ FEATURE_STRIPE: 'live' })]).toEqual([true, true]);
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

  it.each(['test', ''])('FEATURE_STRIPE=%o: a live key in env fails the boot; one in the database is dropped by name only', (mode) => {
    vi.stubEnv('FEATURE_STRIPE', mode);
    expect(() => loadEnv({ ...BASE, STRIPE_API_KEY: 'sk_live_51Abc' })).toThrow();
    const live = overlayOf({ STRIPE_API_KEY: 'rk_live_51Abc', STRIPE_WEBHOOK_SECRET: 'whsec_ok', STRIPE_ENABLED: 'true' });
    expect(live).toEqual({ kept: ['STRIPE_WEBHOOK_SECRET', 'STRIPE_ENABLED'], bad: ['STRIPE_API_KEY'] });
    expect(loadEnv({ ...BASE, ...KEYS }).STRIPE_API_KEY).toBe('rk_test_51Abc');
  });

  it('FEATURE_STRIPE=live: a live key (env or database) is taken; a sandbox or malformed one is not (no test money on real students)', () => {
    vi.stubEnv('FEATURE_STRIPE', 'live');
    const env = loadEnv({ ...BASE, STRIPE_API_KEY: 'sk_live_51Abc' });
    expect([env.STRIPE_API_KEY, stripeKeyIsLive(env)]).toEqual(['sk_live_51Abc', true]);
    expect(overlayOf({ STRIPE_API_KEY: 'rk_live_51Abc' })).toEqual({ kept: ['STRIPE_API_KEY'], bad: [] });
    expect(() => loadEnv({ ...BASE, ...KEYS })).toThrow();
    expect(overlayOf({ STRIPE_API_KEY: 'rk_test_51Abc', STRIPE_WEBHOOK_SECRET: 'whsec_ok' })).toEqual({ kept: ['STRIPE_WEBHOOK_SECRET'], bad: ['STRIPE_API_KEY'] });
    expect(() => loadEnv({ ...BASE, STRIPE_API_KEY: 'pk_live_51Abc' })).toThrow();
    expect(overlayOf({ STRIPE_API_KEY: 'pk_live_51Abc' }).bad).toEqual(['STRIPE_API_KEY']);
  });

  it('no key saved is not live', () => {
    expect(stripeKeyIsLive(loadEnv(BASE))).toBe(false);
  });
});
