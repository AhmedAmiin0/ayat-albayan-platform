import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { moneyApp } from '../../subscriptions/test-app';

// The normal build: FEATURE_STRIPE unset, so StripeTestModule mounts NOTHING.
vi.hoisted(() => {
  delete process.env.FEATURE_STRIPE;
});

describe('Stripe gate OFF (no FEATURE_STRIPE): every Stripe route is 404', () => {
  let app: NestFastifyApplication;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, call } = await moneyApp()));
  afterAll(() => app.close());

  it.each([
    ['GET', '/stripe/feature', 'admin'],
    ['GET', '/admin/stripe/settings', 'admin'],
    ['POST', '/sales/payment-links', 'salesA'],
    ['POST', '/sales/payment-links/quote', 'salesA'],
    ['GET', '/sales/payment-links', 'salesA'],
    ['GET', '/pay/tok_0123456789abcdefghijklmnopqrstuvwxyzABCDE', 'admin'],
    ['GET', '/pay/tok_0123456789abcdefghijklmnopqrstuvwxyzABCDE/checkout', 'admin'],
    ['POST', '/webhooks/stripe', 'admin'],
  ] as const)('%s %s → 404', async (method, url, token) => {
    const res = await call({ method, url, token, body: {} });
    expect(res.statusCode).toBe(404);
  });
});
