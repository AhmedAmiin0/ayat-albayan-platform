import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { paymentRow, STUDENT_ID, SUB_ID, subRow } from '@/modules/finance/subscriptions/money/money.fakes';
import { resetMocks, SALES_A, type Mocks } from '@/modules/finance/subscriptions/test-app';
import { stripeApp } from '@/modules/finance/stripe/testing/stripe-app.fakes';
import { chargeEvent, sessionEvent } from '@/modules/finance/stripe/testing/stripe-events.fakes';
import { signed, stripeDefaults, type StripeMocks } from '@/modules/finance/stripe/testing/stripe-mocks.fakes';

// Go live (owner 2026-11-01, docs/30): the key's mode is the server's (a live key only with
// FEATURE_STRIPE=live, a sandbox one only without). A sandbox event on a live server is test money:
// mode_mismatch, closed. A live event on a server not in live mode is real money: never closed.
vi.hoisted(() => {
  process.env.FEATURE_STRIPE = 'live';
});

describe('POST /webhooks/stripe: the event mode must match the server mode', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let s: StripeMocks;
  let hook: Awaited<ReturnType<typeof stripeApp>>['hook'];
  const send = (event: object) => {
    const { body, signature } = signed(event);
    return hook(body, signature);
  };
  const post = (livemode: boolean) => send({ ...sessionEvent('checkout.session.completed'), livemode });
  const refund = { id: 'ch_1', payment_intent: 'pi_1', created: 1_793_000_000 };
  /** FEATURE_STRIPE back to test (a rollback), the sandbox key of stripeDefaults saved. */
  const testServer = () => {
    vi.stubEnv('FEATURE_STRIPE', 'test');
    vi.stubEnv('STRIPE_API_KEY', 'rk_test_abc123');
  };
  const expectLeftOpen = (res: { statusCode: number }, eventId: string) => {
    expect(res.statusCode).toBe(503);
    expect(s.events.done).not.toHaveBeenCalled();
    expect(m.payments.insert).not.toHaveBeenCalled();
    expect(s.push.notifyAdmins).toHaveBeenCalledWith(
      'payment_due',
      expect.objectContaining({ subject: `stripe_mode_mismatch:${eventId}`, bellOnly: true }),
    );
  };

  beforeAll(async () => ({ app, m, s, hook } = await stripeApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    stripeDefaults(s);
    vi.stubEnv('FEATURE_STRIPE', 'live');
    vi.stubEnv('STRIPE_API_KEY', 'rk_live_abc123'); // under live only a live key loads
    m.payments.subscription.mockResolvedValue({ id: SUB_ID, student_id: STUDENT_ID, currency: 'SAR', status: 'unpaid', cancel_kind: null });
    m.subs.get.mockResolvedValue(subRow({ price: 120 }));
    m.payments.insert.mockResolvedValue(paymentRow({ method: 'card', amount: 120, recorded_by: SALES_A.id }));
    m.payments.get.mockResolvedValue(paymentRow({ method: 'card', amount: 120, recorded_by: SALES_A.id }));
    m.activation.afterPayment.mockResolvedValue(true);
  });

  it('live server, live key, live event: the payment is recorded once', async () => {
    expect((await post(true)).statusCode).toBe(200);
    expect(m.payments.insert).toHaveBeenCalledTimes(1);
    expect(s.events.done).toHaveBeenCalledWith('evt_1', 'paid');
  });

  it('live server, a sandbox event (test money): mode_mismatch, closed, nothing recorded', async () => {
    vi.stubEnv('STRIPE_API_KEY', 'sk_live_abc123');
    expect((await post(false)).statusCode).toBe(200);
    expect(m.payments.insert).not.toHaveBeenCalled();
    expect(s.links.markPaid).not.toHaveBeenCalled();
    expect(s.events.done).toHaveBeenCalledWith('evt_1', 'mode_mismatch');
  });

  it('live server, no key saved yet: 503 before anything is stored, Stripe retries', async () => {
    vi.stubEnv('STRIPE_API_KEY', '');
    expect((await post(true)).statusCode).toBe(503);
    expect(s.events.begin).not.toHaveBeenCalled();
    expect(s.events.done).not.toHaveBeenCalled();
  });

  it('server back on test, a live payment: 503, left open for the retry, the admins get a bell', async () => {
    testServer();
    expectLeftOpen(await post(true), 'evt_1');
    expect(s.links.markPaid).not.toHaveBeenCalled();
  });

  it('server back on test, a live refund: 503, left open, a bell; no refund recorded', async () => {
    testServer();
    const event = { ...chargeEvent('charge.refunded', refund), livemode: true };
    expectLeftOpen(await send(event), 'evt_9');
    expect(s.stripe.refunds.list).not.toHaveBeenCalled();
  });

  it('server on test, a sandbox event: recorded as before', async () => {
    testServer();
    expect((await post(false)).statusCode).toBe(200);
    expect(s.events.done).toHaveBeenCalledWith('evt_1', 'paid');
  });
});
