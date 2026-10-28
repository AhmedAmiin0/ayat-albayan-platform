import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetMocks, type Mocks } from '../../subscriptions/test-app';
import { stripeApp } from '../testing/stripe-app.fakes';
import { stripeDefaults, type StripeMocks } from '../testing/stripe-mocks.fakes';

vi.hoisted(() => {
  process.env.FEATURE_STRIPE = 'test';
});

const KEY = 'rk_test_51SecretValueABCDwxyz';

describe('/admin/stripe/settings: write-only sandbox keys, masked on read, a live key refused', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let s: StripeMocks;
  let call: Awaited<ReturnType<typeof stripeApp>>['call'];

  beforeAll(async () => ({ app, m, s, call } = await stripeApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    stripeDefaults(s);
    s.settings.secret.mockImplementation(async (name: string) => (name === 'api_key' ? KEY : null));
  });

  it('GET masks the key (prefix and last 4) and never returns it', async () => {
    const res = await call({ method: 'GET', url: '/admin/stripe/settings' });
    expect(res.json()).toMatchObject({ enabled: true, api_key: { set: true, masked: 'rk_test_••••wxyz' }, webhook_secret: { set: false, masked: null } });
    expect(res.body).not.toContain('SecretValue');
  });

  it('a live key (rk_live_ / sk_live_) is 400 stripe_live_key_refused, nothing saved', async () => {
    for (const apiKey of ['rk_live_abc', 'sk_live_abc', 'pk_test_abc']) {
      const res = await call({ method: 'PATCH', url: '/admin/stripe/settings', body: { apiKey } });
      expect([res.statusCode, res.json().code]).toEqual([400, 'stripe_live_key_refused']);
    }
    expect((await call({ method: 'PATCH', url: '/admin/stripe/settings', body: { webhookSecret: 'nope' } })).json().code).toBe('invalid_secret');
    expect(s.settings.setSecret).not.toHaveBeenCalled();
  });

  it('a sandbox key and the switch are saved; null clears; the audit row names what changed, never a value', async () => {
    const res = await call({ method: 'PATCH', url: '/admin/stripe/settings', body: { apiKey: KEY, webhookSecret: null, enabled: true, maxDiscountPct: 15 } });
    expect(res.statusCode).toBe(200);
    expect(s.settings.setSecret).toHaveBeenCalledWith('api_key', KEY);
    expect(s.settings.clearSecret).toHaveBeenCalledWith('webhook_secret');
    expect(s.settings.write).toHaveBeenCalledWith({ stripe_enabled: true, max_discount_pct: 15 }, expect.any(String));
    expect(JSON.stringify(m.audit.record.mock.calls)).not.toContain('SecretValue');
    expect(m.audit.record).toHaveBeenCalledWith(expect.objectContaining({ entity: 'stripe_settings', after: expect.objectContaining({ api_key: 'set', webhook_secret: 'cleared' }) }));
  });

  it('a salesperson cannot read or write them', async () => {
    expect((await call({ method: 'PATCH', url: '/admin/stripe/settings', token: 'salesA', body: { enabled: true } })).statusCode).toBe(403);
  });
});
