import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetMocks, type Mocks } from '@/modules/finance/subscriptions/tests/test-app';
import { stripeApp } from '@/modules/finance/stripe/testing/stripe-app.fakes';
import { stripeDefaults, type StripeMocks } from '@/modules/finance/stripe/testing/stripe-mocks.fakes';

vi.hoisted(() => {
  process.env.FEATURE_STRIPE = 'test';
  process.env.API_PUBLIC_URL = 'https://api.test.example';
});

describe('cancelling a payment link: an id that is not a uuid', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let s: StripeMocks;
  let call: Awaited<ReturnType<typeof stripeApp>>['call'];

  beforeAll(async () => ({ app, m, s, call } = await stripeApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    stripeDefaults(s);
  });

  it('POST /sales/payment-links/not-a-uuid/cancel answers 400 validation_failed', async () => {
    const url = '/sales/payment-links/not-a-uuid/cancel';
    const res = await call({ method: 'POST', url, token: 'salesA' });
    expect([res.statusCode, res.json().code]).toEqual([400, 'validation_failed']);
    expect(s.links.get).not.toHaveBeenCalled();
  });
});
