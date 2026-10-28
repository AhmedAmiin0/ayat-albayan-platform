import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { stripeApp } from '../testing/stripe-app.fakes';
import { signed, stripeDefaults, TOKEN, type StripeMocks } from '../testing/stripe-mocks.fakes';

vi.hoisted(() => {
  process.env.FEATURE_STRIPE = 'test';
});

describe('Stripe gate: FEATURE_STRIPE=test but stripe_settings.stripe_enabled false', () => {
  let app: NestFastifyApplication;
  let s: StripeMocks;
  let call: Awaited<ReturnType<typeof stripeApp>>['call'];
  let hook: Awaited<ReturnType<typeof stripeApp>>['hook'];

  beforeAll(async () => ({ app, s, call, hook } = await stripeApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    stripeDefaults(s);
    s.settings.read.mockResolvedValue({ stripe_enabled: false, max_discount_pct: null });
  });

  it('the links, the payment page and the webhook are 404; nothing is read or recorded', async () => {
    for (const [method, url] of [['GET', '/sales/payment-links'], ['GET', `/pay/${TOKEN}`], ['GET', `/pay/${TOKEN}/checkout`]] as const)
      expect((await call({ method, url, token: 'salesA' })).statusCode).toBe(404);
    const { body, signature } = signed({ id: 'evt_1', type: 'checkout.session.completed' });
    expect((await hook(body, signature)).statusCode).toBe(404);
    expect(s.links.byToken).not.toHaveBeenCalled();
    expect(s.events.begin).not.toHaveBeenCalled();
  });

  it('GET /stripe/feature says off; the admin settings stay reachable so the owner can turn it on', async () => {
    expect((await call({ method: 'GET', url: '/stripe/feature' })).json()).toEqual({ stripe: false });
    const res = await call({ method: 'GET', url: '/admin/stripe/settings' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ enabled: false, webhook_url: expect.stringMatching(/\/webhooks\/stripe$/) });
  });

  it('the admin settings are admin-only', async () => {
    expect((await call({ method: 'GET', url: '/admin/stripe/settings', token: 'salesA' })).statusCode).toBe(403);
  });
});
