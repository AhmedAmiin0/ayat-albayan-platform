import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PAYMENT_ID, paymentRow, STUDENT_ID, SUB_ID } from '../subscriptions/money.fakes';
import { ADMIN, moneyApp, resetMocks, type Mocks } from '../subscriptions/test-app';

const REQUEST = '7d1c6a52-3b7e-4f0e-9a51-2f7c3e9b8a11';
const body = { subscriptionId: SUB_ID, amount: 145, currency: 'SAR', method: 'bank', paidAt: '2026-10-01T09:00:00Z', clientRequestId: REQUEST };
const FLIP = { after: { status: 'active', via: 'payment', payment_id: PAYMENT_ID }, at: '2026-10-01T09:00:00Z' };

// Owner 2026-10-12 / 2026-10-15 (docs/11 §7): the → «مشترك» flip is linked to its payment and its from-status.
describe('payments and the student status', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    m.payments.subscription.mockResolvedValue({ id: SUB_ID, student_id: STUDENT_ID, currency: 'SAR' });
    m.payments.get.mockResolvedValue(paymentRow({ client_request_id: REQUEST }));
    m.statuses.move.mockResolvedValue(true);
  });

  it('a retried form whose payment is already recorded re-runs the flip (idempotent), no second insert or audit', async () => {
    m.payments.byRequest.mockResolvedValue(paymentRow({ client_request_id: REQUEST }));
    expect((await call({ method: 'POST', url: '/payments', body })).statusCode).toBe(201);
    expect(m.activation.afterPayment).toHaveBeenCalledWith(STUDENT_ID, ADMIN.id, PAYMENT_ID);
    expect(m.payments.insert).not.toHaveBeenCalled();
    expect(m.audit.record).not.toHaveBeenCalled();
  });

  it('DELETE of the payment that flipped the student, none left → back to trial, audited by the admin', async () => {
    m.statuses.lastStatusChange.mockResolvedValue(FLIP);
    m.statuses.student.mockResolvedValue({ status: 'active', tz: 'Asia/Riyadh' });
    m.statuses.hasPositivePayment.mockResolvedValue(false);
    expect((await call({ method: 'DELETE', url: `/payments/${PAYMENT_ID}` })).statusCode).toBeLessThan(300);
    expect(m.statuses.move).toHaveBeenCalledWith(
      { studentId: STUDENT_ID, from: 'active', to: 'trial' },
      { actorId: ADMIN.id, after: { via: 'payment_deleted', payment_id: PAYMENT_ID } },
    );
  });

  it('DELETE of a flip that recorded its from-status (owner 2026-10-15) → back to it, e.g. expired', async () => {
    m.statuses.lastStatusChange.mockResolvedValue({ ...FLIP, after: { ...FLIP.after, from: 'expired', reason: 'payment' } });
    m.statuses.student.mockResolvedValue({ status: 'active', tz: 'Asia/Riyadh' });
    expect((await call({ method: 'DELETE', url: `/payments/${PAYMENT_ID}` })).statusCode).toBeLessThan(300);
    expect(m.statuses.move).toHaveBeenCalledWith(
      { studentId: STUDENT_ID, from: 'active', to: 'expired' },
      { actorId: ADMIN.id, after: { via: 'payment_deleted', payment_id: PAYMENT_ID, from: 'active', reason: 'payment_deleted' } },
    );
    expect(m.statuses.hasPositivePayment).not.toHaveBeenCalled();
  });

  it('DELETE when the admin changed the status by hand since → nothing reverted', async () => {
    m.statuses.lastStatusChange.mockResolvedValue({ after: { status: 'active' }, at: '2026-10-02T09:00:00Z' });
    m.statuses.student.mockResolvedValue({ status: 'active', tz: 'Asia/Riyadh' });
    await call({ method: 'DELETE', url: `/payments/${PAYMENT_ID}` });
    expect(m.statuses.move).not.toHaveBeenCalled();
  });

  it('an edit (PATCH amount) never changes the student status', async () => {
    m.statuses.lastStatusChange.mockResolvedValue(FLIP);
    m.payments.update.mockResolvedValue(paymentRow({ amount: 100 }));
    await call({ method: 'PATCH', url: `/payments/${PAYMENT_ID}`, body: { amount: 100 } });
    expect(m.statuses.move).not.toHaveBeenCalled();
    expect(m.activation.afterPayment).not.toHaveBeenCalled();
  });
});
