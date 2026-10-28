import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PAYMENT_ID, paymentRow, STUDENT_ID, SUB_ID } from '../../subscriptions/money/money.fakes';
import { resetMocks, SALES_A, type Mocks } from '../../subscriptions/test-app';
import { uuidFor } from '../links/link-ids';
import { stripeApp } from '../testing/stripe-app.fakes';
import { chargeEvent } from '../testing/stripe-events.fakes';
import { LINK_ID, linkRow, signed, stripeDefaults, type StripeMocks } from '../testing/stripe-mocks.fakes';

vi.hoisted(() => {
  process.env.FEATURE_STRIPE = 'test';
});

const CHARGE = { id: 'ch_1', object: 'charge', payment_intent: 'pi_1', amount: 12000, amount_refunded: 5000, currency: 'sar' };
const refund = (id: string, amount: number, status = 'succeeded') => ({ id, object: 'refund', amount, currency: 'sar', status, created: 1_793_100_000, charge: 'ch_1' });

describe('POST /webhooks/stripe: refunds reverse through a refund payment, disputes only alert', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let s: StripeMocks;
  let hook: Awaited<ReturnType<typeof stripeApp>>['hook'];
  const post = (payload: object) => {
    const { body, signature } = signed(payload);
    return hook(body, signature);
  };

  beforeAll(async () => ({ app, m, s, hook } = await stripeApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    stripeDefaults(s);
    s.links.byPaymentIntent.mockResolvedValue(linkRow({ status: 'paid', paid_payment_id: PAYMENT_ID, stripe_payment_intent: 'pi_1' }));
    m.payments.subscription.mockResolvedValue({ id: SUB_ID, student_id: STUDENT_ID, currency: 'SAR', status: 'active' });
    m.payments.netPaid.mockResolvedValue(120);
    m.payments.insert.mockResolvedValue(paymentRow({ kind: 'refund', method: 'card', amount: 50 }));
    m.payments.get.mockResolvedValue(paymentRow({ kind: 'refund', method: 'card', amount: 50 }));
  });

  it('one refund payment per succeeded Stripe refund, keyed by the refund id (a replay counts nothing twice)', async () => {
    s.stripe.refunds.list.mockResolvedValue({ data: [refund('re_1', 5000), refund('re_2', 1000, 'pending')] });
    expect((await post(chargeEvent('charge.refunded', CHARGE))).statusCode).toBe(200);
    expect(s.stripe.refunds.list).toHaveBeenCalledWith({ charge: 'ch_1', limit: 100 });
    expect(m.payments.insert).toHaveBeenCalledTimes(1);
    expect(m.payments.insert).toHaveBeenCalledWith(
      expect.objectContaining({ subscription_id: SUB_ID, amount: 50, kind: 'refund', method: 'card', recorded_by: SALES_A.id, client_request_id: uuidFor('re_1') }),
    );
    expect(s.events.done).toHaveBeenCalledWith('evt_9', 'refunds:1');
    m.payments.byRequest.mockResolvedValue({ id: PAYMENT_ID });
    m.payments.insert.mockClear();
    await post(chargeEvent('charge.refunded', CHARGE, 'evt_10'));
    expect(m.payments.insert).not.toHaveBeenCalled();
  });

  it('the link found through its Checkout Session when the intent was not saved; a refund before its payment is retried', async () => {
    s.links.byPaymentIntent.mockResolvedValue(null);
    s.stripe.checkout.sessions.list.mockResolvedValue({ data: [{ client_reference_id: LINK_ID }] });
    s.links.get.mockResolvedValue(linkRow());
    const fresh = { ...CHARGE, created: Math.floor(Date.now() / 1000) };
    const res = await post(chargeEvent('charge.refunded', fresh));
    expect(s.stripe.checkout.sessions.list).toHaveBeenCalledWith({ payment_intent: 'pi_1', limit: 1 });
    expect(res.statusCode).toBe(500);
    expect(s.events.done).not.toHaveBeenCalled();
    // An hour later the payment was evidently refused: the admins settle it, Stripe stops retrying.
    expect((await post(chargeEvent('charge.refunded', { ...CHARGE, created: 1_000_000 }))).statusCode).toBe(200);
    expect(s.events.done).toHaveBeenCalledWith('evt_9', 'refund_alerted');
  });

  it('refund.updated: a refund that was pending at charge.refunded is recorded once it succeeds', async () => {
    s.stripe.refunds.list.mockResolvedValue({ data: [refund('re_2', 5000)] });
    await post(chargeEvent('refund.updated', { ...refund('re_2', 5000), payment_intent: 'pi_1' }));
    expect(m.payments.insert).toHaveBeenCalledWith(expect.objectContaining({ kind: 'refund', client_request_id: uuidFor('re_2') }));
    m.payments.insert.mockClear();
    await post(chargeEvent('refund.updated', { ...refund('re_3', 100, 'pending'), payment_intent: 'pi_1' }, 'evt_11'));
    expect(m.payments.insert).not.toHaveBeenCalled();
  });

  it('a refund above the net paid is not recorded: the admins get a bell row', async () => {
    m.payments.netPaid.mockResolvedValue(10);
    s.stripe.refunds.list.mockResolvedValue({ data: [refund('re_1', 5000)] });
    await post(chargeEvent('charge.refunded', CHARGE));
    expect(m.payments.insert).not.toHaveBeenCalled();
    expect(s.push.notifyAdmins).toHaveBeenCalledWith('payment_due', expect.objectContaining({ subject: 'stripe_refund_refused:re_1' }));
  });

  it('charge.dispute.created: an admin bell row only, nothing recorded or changed', async () => {
    const dispute = { id: 'dp_1', object: 'dispute', amount: 12000, currency: 'sar', payment_intent: 'pi_1', charge: 'ch_1' };
    await post(chargeEvent('charge.dispute.created', dispute));
    expect(s.push.notifyAdmins).toHaveBeenCalledWith('payment_due', expect.objectContaining({ subject: 'stripe_dispute:dp_1', bellOnly: true, data: { studentId: STUDENT_ID } }));
    expect(m.payments.insert).not.toHaveBeenCalled();
    expect(s.links.markPaid).not.toHaveBeenCalled();
    expect(s.events.done).toHaveBeenCalledWith('evt_9', 'dispute_alert');
  });
});
