import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { stripeApp } from '@/modules/finance/stripe/testing/stripe-app.fakes';
import { signed, stripeDefaults, TOKEN, type StripeMocks } from '@/modules/finance/stripe/testing/stripe-mocks.fakes';

vi.hoisted(() => {
  process.env.FEATURE_STRIPE = 'test';
});

describe('Stripe gate: FEATURE_STRIPE=test but «الدفع الإلكتروني» (STRIPE_ENABLED) off', () => {
  let app: NestFastifyApplication;
  let s: StripeMocks;
  let call: Awaited<ReturnType<typeof stripeApp>>['call'];
  let hook: Awaited<ReturnType<typeof stripeApp>>['hook'];

  beforeAll(async () => ({ app, s, call, hook } = await stripeApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    stripeDefaults(s);
    vi.stubEnv('STRIPE_ENABLED', 'false');
  });

  it('the links and the payment page are 404; nothing is read', async () => {
    for (const [method, url] of [['GET', '/sales/payment-links'], ['GET', `/pay/${TOKEN}`], ['GET', `/pay/${TOKEN}/checkout`]] as const)
      expect((await call({ method, url, token: 'salesA' })).statusCode).toBe(404);
    expect(s.links.byToken).not.toHaveBeenCalled();
  });

  it('the webhook still records what Stripe already took (a session opened before the switch went off)', async () => {
    const { body, signature } = signed({ id: 'evt_1', type: 'customer.created', created: 1, livemode: false, data: { object: {} } });
    expect((await hook(body, signature)).statusCode).toBe(200);
    expect(s.events.done).toHaveBeenCalledWith('evt_1', 'ignored');
  });

  it('GET /stripe/feature: on only with the switch on AND both keys saved', async () => {
    const feature = async () => (await call({ method: 'GET', url: '/stripe/feature' })).json();
    expect(await feature()).toEqual({ stripe: false });
    vi.stubEnv('STRIPE_ENABLED', 'true');
    expect(await feature()).toEqual({ stripe: true });
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '');
    expect(await feature()).toEqual({ stripe: false });
  });

  it('the old admin screen is gone: the keys and the switch live in «التكاملات»', async () => {
    expect((await call({ method: 'GET', url: '/admin/stripe/settings' })).statusCode).toBe(404);
  });
});
