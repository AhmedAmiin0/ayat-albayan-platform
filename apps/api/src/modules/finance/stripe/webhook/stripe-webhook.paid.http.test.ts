import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PAYMENT_ID, paymentRow, STUDENT_ID, SUB_ID, subRow } from '../../subscriptions/money/money.fakes';
import { resetMocks, SALES_A, type Mocks } from '../../subscriptions/test-app';
import { uuidFor } from '../links/link-ids';
import { stripeApp } from '../testing/stripe-app.fakes';
import { CREATED, sessionEvent } from '../testing/stripe-events.fakes';
import { LINK_ID, linkRow, SESSION, signed, stripeDefaults, type StripeMocks } from '../testing/stripe-mocks.fakes';

vi.hoisted(() => {
  process.env.FEATURE_STRIPE = 'test';
});

describe('POST /webhooks/stripe: verified, idempotent, the payment recorded once through PaymentsService', () => {
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
    m.payments.subscription.mockResolvedValue({ id: SUB_ID, student_id: STUDENT_ID, currency: 'SAR', status: 'unpaid', cancel_kind: null });
    m.subs.get.mockResolvedValue(subRow({ price: 120 })); // the link's package: nothing paid on it yet
    m.payments.insert.mockResolvedValue(paymentRow({ method: 'card', amount: 120, recorded_by: SALES_A.id }));
    m.payments.get.mockResolvedValue(paymentRow({ method: 'card', amount: 120, recorded_by: SALES_A.id }));
    m.activation.afterPayment.mockResolvedValue(true);
  });

  it('a bad signature is 400 and nothing is stored; the signature is checked on the raw bytes', async () => {
    const { body } = signed(sessionEvent('checkout.session.completed'));
    expect((await hook(body, 't=1,v1=deadbeef')).json()).toMatchObject({ code: 'bad_signature' });
    const { signature } = signed(sessionEvent('checkout.session.completed'));
    expect((await hook(body.replace('12000', '1'), signature)).statusCode).toBe(400);
    expect(s.events.begin).not.toHaveBeenCalled();
    expect(m.payments.insert).not.toHaveBeenCalled();
  });

  it('paid: attribution first (nobody brought the student), then ONE card payment by the link’s assistant; link paid; her bell', async () => {
    const res = await post(sessionEvent('checkout.session.completed'));
    expect(res.statusCode).toBe(200);
    expect(s.links.attribute).toHaveBeenCalledWith({ studentId: STUDENT_ID, assistantId: SALES_A.id, broughtAt: linkRow().created_at });
    expect(s.links.attribute.mock.invocationCallOrder[0]).toBeLessThan(m.payments.insert.mock.invocationCallOrder[0] ?? 0);
    expect(m.payments.insert).toHaveBeenCalledTimes(1);
    expect(m.payments.insert).toHaveBeenCalledWith(
      expect.objectContaining({ subscription_id: SUB_ID, amount: 120, currency: 'SAR', kind: 'payment', method: 'card', recorded_by: SALES_A.id, client_request_id: uuidFor(SESSION), paid_at: new Date(CREATED * 1000).toISOString() }),
    );
    expect(m.activation.afterPayment).toHaveBeenCalledWith(STUDENT_ID, SALES_A.id, PAYMENT_ID); // recompute → «مشترك»
    expect(s.links.markPaid).toHaveBeenCalledWith(LINK_ID, expect.objectContaining({ paymentId: PAYMENT_ID, paymentIntent: 'pi_1' }));
    expect(s.push.notifyProfiles).toHaveBeenCalledWith(expect.objectContaining({ kind: 'payment_due', profileIds: [SALES_A.id], bellOnly: true }));
    expect(s.events.done).toHaveBeenCalledWith('evt_1', 'paid');
  });

  it('a duplicate event is ignored; the same session again (another event id) replays the payment, never a second one', async () => {
    s.events.begin.mockResolvedValue(true);
    expect((await post(sessionEvent('checkout.session.completed'))).statusCode).toBe(200);
    expect(m.payments.insert).not.toHaveBeenCalled();
    s.events.begin.mockResolvedValue(false);
    m.payments.byRequest.mockResolvedValue({ id: PAYMENT_ID });
    await post(sessionEvent('checkout.session.async_payment_succeeded', {}, 'evt_2'));
    expect(m.payments.byRequest).toHaveBeenCalledWith(uuidFor(SESSION));
    expect(m.payments.insert).not.toHaveBeenCalled();
  });

  it('a student already brought keeps their assistant; unpaid (async pending) records nothing; async failed frees the link', async () => {
    s.links.student.mockResolvedValue({ broughtBy: 'someone-else', priced: [SUB_ID] });
    await post(sessionEvent('checkout.session.completed'));
    expect(s.links.attribute).not.toHaveBeenCalled();
    m.payments.insert.mockClear();
    await post(sessionEvent('checkout.session.completed', { payment_status: 'unpaid' }, 'evt_3'));
    expect(m.payments.insert).not.toHaveBeenCalled();
    expect(s.links.setProcessing).toHaveBeenCalledWith(LINK_ID, true);
    await post(sessionEvent('checkout.session.async_payment_failed', { payment_status: 'unpaid' }, 'evt_4'));
    expect(s.links.setSession).toHaveBeenCalledWith({ id: LINK_ID, prev: SESSION, session: null });
    expect(s.events.done).toHaveBeenCalledWith('evt_4', 'async_failed');
  });

  it('a live-mode event is refused (the test build); a package the platform refuses alerts the admins, no retry', async () => {
    await post({ ...sessionEvent('checkout.session.completed'), livemode: true });
    expect(m.payments.insert).not.toHaveBeenCalled();
    expect(s.events.done).toHaveBeenCalledWith('evt_1', 'live_refused');
    m.payments.subscription.mockResolvedValue({ id: SUB_ID, student_id: STUDENT_ID, currency: 'SAR', status: 'cancelled', cancel_kind: 'unused' });
    const res = await post(sessionEvent('checkout.session.completed', {}, 'evt_5'));
    expect(res.statusCode).toBe(200);
    expect(s.events.done).toHaveBeenCalledWith('evt_5', 'refused:subscription_cancelled');
    expect(s.push.notifyAdmins).toHaveBeenCalledWith('payment_due', expect.objectContaining({ bellOnly: true }));
  });

  it('a package paid another way while the session stayed open is refused with a bell, no second payment; its own retry replays', async () => {
    m.subs.paid.mockResolvedValue(new Map([[SUB_ID, 120]])); // the assistant recorded the bank transfer meanwhile
    expect((await post(sessionEvent('checkout.session.completed'))).statusCode).toBe(200);
    expect(m.payments.insert).not.toHaveBeenCalled();
    expect(s.links.attribute).not.toHaveBeenCalled();
    expect(s.links.markPaid).not.toHaveBeenCalled();
    expect(s.events.done).toHaveBeenCalledWith('evt_1', 'refused:already_paid');
    expect(s.push.notifyAdmins).toHaveBeenCalledWith('payment_due', expect.objectContaining({ subject: `payment_link_refused:${SESSION}`, bellOnly: true }));
    m.payments.byRequest.mockResolvedValue({ id: PAYMENT_ID }); // this session's payment is the one on the package
    await post(sessionEvent('checkout.session.completed', {}, 'evt_2'));
    expect(m.payments.insert).not.toHaveBeenCalled();
    expect(s.links.markPaid).toHaveBeenCalledWith(LINK_ID, expect.objectContaining({ paymentId: PAYMENT_ID }));
  });

  it('never a takeover: a renewal, or a student with an earlier package, keeps brought_by; an orphan session alerts', async () => {
    s.links.get.mockResolvedValue(linkRow({ kind: 'renewal' }));
    await post(sessionEvent('checkout.session.completed'));
    s.links.get.mockResolvedValue(linkRow());
    s.links.student.mockResolvedValue({ broughtBy: null, priced: [SUB_ID, 'older-package'] });
    await post(sessionEvent('checkout.session.completed', {}, 'evt_6'));
    expect(s.links.attribute).not.toHaveBeenCalled();
    s.links.get.mockResolvedValue(linkRow({ subscription_id: null }));
    await post(sessionEvent('checkout.session.completed', {}, 'evt_7'));
    expect(s.events.done).toHaveBeenCalledWith('evt_7', 'orphan_alerted');
    expect(s.push.notifyAdmins).toHaveBeenCalledWith('payment_due', expect.objectContaining({ subject: `payment_link_orphan:${SESSION}` }));
  });
});
