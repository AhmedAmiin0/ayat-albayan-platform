import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  paymentRow,
  STUDENT_ID,
  SUB_ID,
  subRow,
} from '@/modules/finance/subscriptions/money/tests/money.fakes';
import { resetMocks, SALES_A, type Mocks } from '@/modules/finance/subscriptions/tests/test-app';
import { stripeApp } from '@/modules/finance/stripe/testing/stripe-app.fakes';
import { sessionEvent } from '@/modules/finance/stripe/testing/stripe-events.fakes';
import {
  linkRow,
  signed,
  stripeDefaults,
  type StripeMocks,
} from '@/modules/finance/stripe/testing/stripe-mocks.fakes';

vi.hoisted(() => {
  process.env.FEATURE_STRIPE = 'test';
});

const KWD = { currency: 'KWD', status: 'unpaid', cancel_kind: null };

// Stripe counts KWD / OMR in thousandths: 12.5 KWD arrives as amount_total 12500.
describe('POST /webhooks/stripe: a KWD link is recorded in KWD, not ten times over', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let s: StripeMocks;
  let hook: Awaited<ReturnType<typeof stripeApp>>['hook'];

  beforeAll(async () => ({ app, m, s, hook } = await stripeApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    stripeDefaults(s);
    s.links.get.mockResolvedValue(linkRow({ currency: 'KWD', amount: 12.5 }));
    m.payments.subscription.mockResolvedValue({ id: SUB_ID, student_id: STUDENT_ID, ...KWD });
    m.subs.get.mockResolvedValue(subRow({ price: 12.5, currency: 'KWD' }));
    const paid = paymentRow({ method: 'card', amount: 12.5, recorded_by: SALES_A.id });
    m.payments.insert.mockResolvedValue(paid);
    m.payments.get.mockResolvedValue(paid);
    m.activation.afterPayment.mockResolvedValue(true);
  });

  it('amount_total 12500 kwd → one 12.5 KWD card payment', async () => {
    const event = sessionEvent('checkout.session.completed', { amount_total: 12500, currency: 'kwd' });
    const { body, signature } = signed(event);
    expect((await hook(body, signature)).statusCode).toBe(200);
    const payment = expect.objectContaining({ amount: 12.5, currency: 'KWD', method: 'card' });
    expect(m.payments.insert).toHaveBeenCalledWith(payment);
  });
});
