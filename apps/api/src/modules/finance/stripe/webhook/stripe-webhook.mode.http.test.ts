import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { paymentRow, STUDENT_ID, SUB_ID, subRow } from '../../subscriptions/money/money.fakes';
import { resetMocks, SALES_A, type Mocks } from '../../subscriptions/test-app';
import { stripeApp } from '../testing/stripe-app.fakes';
import { sessionEvent } from '../testing/stripe-events.fakes';
import { signed, stripeDefaults, type StripeMocks } from '../testing/stripe-mocks.fakes';

// Go live (owner 2026-11-01, docs/30): the server runs with FEATURE_STRIPE=live. An event is dispatched only
// when its mode is the saved key's (a live key ↔ a live event, a sandbox key ↔ a sandbox event).
vi.hoisted(() => {
  process.env.FEATURE_STRIPE = 'live';
});

describe('POST /webhooks/stripe under FEATURE_STRIPE=live: the event mode must match the key mode', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let s: StripeMocks;
  let hook: Awaited<ReturnType<typeof stripeApp>>['hook'];
  const post = (livemode: boolean) => {
    const { body, signature } = signed({ ...sessionEvent('checkout.session.completed'), livemode });
    return hook(body, signature);
  };

  beforeAll(async () => ({ app, m, s, hook } = await stripeApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    stripeDefaults(s); // a sandbox key saved
    vi.stubEnv('FEATURE_STRIPE', 'live');
    m.payments.subscription.mockResolvedValue({ id: SUB_ID, student_id: STUDENT_ID, currency: 'SAR', status: 'unpaid', cancel_kind: null });
    m.subs.get.mockResolvedValue(subRow({ price: 120 }));
    m.payments.insert.mockResolvedValue(paymentRow({ method: 'card', amount: 120, recorded_by: SALES_A.id }));
    m.payments.get.mockResolvedValue(paymentRow({ method: 'card', amount: 120, recorded_by: SALES_A.id }));
    m.activation.afterPayment.mockResolvedValue(true);
  });

  it('a live key and a live event: the payment is recorded once', async () => {
    vi.stubEnv('STRIPE_API_KEY', 'rk_live_abc123');
    expect((await post(true)).statusCode).toBe(200);
    expect(m.payments.insert).toHaveBeenCalledTimes(1);
    expect(s.events.done).toHaveBeenCalledWith('evt_1', 'paid');
  });

  it('a live key and a sandbox event: mode_mismatch, nothing recorded', async () => {
    vi.stubEnv('STRIPE_API_KEY', 'sk_live_abc123');
    expect((await post(false)).statusCode).toBe(200);
    expect(m.payments.insert).not.toHaveBeenCalled();
    expect(s.links.markPaid).not.toHaveBeenCalled();
    expect(s.events.done).toHaveBeenCalledWith('evt_1', 'mode_mismatch');
  });

  it('a sandbox key (a dry run under live) and a sandbox event: recorded', async () => {
    expect((await post(false)).statusCode).toBe(200);
    expect(m.payments.insert).toHaveBeenCalledTimes(1);
    expect(s.events.done).toHaveBeenCalledWith('evt_1', 'paid');
  });

  it('a sandbox key and a live event: mode_mismatch, nothing recorded', async () => {
    expect((await post(true)).statusCode).toBe(200);
    expect(m.payments.insert).not.toHaveBeenCalled();
    expect(s.events.done).toHaveBeenCalledWith('evt_1', 'mode_mismatch');
  });
});
