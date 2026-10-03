import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { moneyApp, resetMocks, type Mocks } from '../subscriptions/test-app';
import { earning, eid, OTHER_TEACHER, PAYMENT, paymentRow, REQUEST, session, TEACHER } from './earnings.fakes';

const BODY = { amount: 70, method: 'cash', paidAt: '2026-10-01T09:00:00Z', clientRequestId: REQUEST };

describe('teacher earnings routes (admin)', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    m.earnings.teacher.mockResolvedValue({ id: TEACHER, display_name_ar: 'أبرار' });
    m.earnings.forPayment.mockResolvedValue([earning(1)]);
    m.earnings.payment.mockResolvedValue(paymentRow());
    m.earnings.record.mockResolvedValue({ payment_id: PAYMENT, replayed: false });
  });

  it('GET balance, sessions (status filter, paged) and payments', async () => {
    m.earnings.money.mockResolvedValue([earning(1, { paid_amount: 30, status: 'partially_paid' })]);
    expect((await call({ method: 'GET', url: `/teacher-earnings/${TEACHER}` })).json()).toMatchObject({ earned: 70, paid: 30, outstanding: 40 });
    m.earnings.sessions.mockResolvedValue({ items: [session(1)], total: 1, page: 1, pageSize: 25 });
    const res = await call({ method: 'GET', url: `/teacher-earnings/${TEACHER}/sessions?status=unpaid` });
    expect(m.earnings.sessions).toHaveBeenCalledWith(TEACHER, { status: 'unpaid', page: 1, pageSize: 25 });
    expect(res.json().items[0]).toMatchObject({ id: eid(1), students: ['سهيلة'], outstanding: 70 });
    m.earnings.payments.mockResolvedValue({ items: [paymentRow()], total: 1, page: 1, pageSize: 25 });
    expect((await call({ method: 'GET', url: `/teacher-earnings/${TEACHER}/payments` })).json().items).toHaveLength(1);
    expect((await call({ method: 'GET', url: `/teacher-earnings/${TEACHER}/sessions?status=bogus` })).statusCode).toBe(400);
  });

  it('POST payments: records the allocation and answers with the payment', async () => {
    const res = await call({ method: 'POST', url: `/teacher-earnings/${TEACHER}/payments`, body: BODY });
    expect(res.statusCode).toBe(200);
    expect(m.earnings.record).toHaveBeenCalledWith(expect.objectContaining({ items: [{ earning_id: eid(1), amount: 70 }], client_request_id: REQUEST }));
    expect(res.json()).toMatchObject({ replayed: false, payment: { id: PAYMENT } });
  });

  it('POST payments: overpayment 409, bad body 400, retry replays', async () => {
    const over = await call({ method: 'POST', url: `/teacher-earnings/${TEACHER}/payments`, body: { ...BODY, amount: 71 } });
    expect(over.statusCode).toBe(409);
    expect(over.json().code).toBe('overpayment');
    expect(m.earnings.record).not.toHaveBeenCalled();
    expect((await call({ method: 'POST', url: `/teacher-earnings/${TEACHER}/payments`, body: { ...BODY, amount: 0 } })).statusCode).toBe(400);
    m.earnings.byRequest.mockResolvedValue(paymentRow());
    expect((await call({ method: 'POST', url: `/teacher-earnings/${TEACHER}/payments`, body: BODY })).json().replayed).toBe(true);
  });

  it('receipt upload URL is for the teacher’s folder; receipt download by payment id', async () => {
    m.storage.signedUpload.mockResolvedValue({ bucket: 'receipts', path: 'p', token: 't', signed_url: 'u' });
    const up = await call({ method: 'POST', url: `/teacher-earnings/${TEACHER}/receipt-upload-url`, body: { mime: 'image/png', size: 10 } });
    expect(up.statusCode).toBe(200);
    expect(m.storage.signedUpload).toHaveBeenCalledWith({ bucket: 'receipts', path: expect.stringMatching(new RegExp(`^${TEACHER}/.+\\.png$`)) });
    expect((await call({ method: 'POST', url: `/teacher-earnings/${TEACHER}/receipt-upload-url`, body: { mime: 'text/html', size: 10 } })).statusCode).toBe(400);
    m.earnings.payment.mockResolvedValue(paymentRow({ receipt_path: `${TEACHER}/a.png` }));
    m.storage.signedDownload.mockResolvedValue({ url: 'u', expires_at: 'e' });
    expect((await call({ method: 'GET', url: `/teacher-earnings/payments/${PAYMENT}/receipt` })).json()).toEqual({ url: 'u', expires_at: 'e' });
  });

  it('POST resync: all teachers or one', async () => {
    m.earnings.resync.mockResolvedValue(12);
    expect((await call({ method: 'POST', url: '/teacher-earnings/resync', body: {} })).json()).toEqual({ lessons: 12 });
    await call({ method: 'POST', url: '/teacher-earnings/resync', body: { teacherId: TEACHER } });
    expect(m.earnings.resync).toHaveBeenLastCalledWith(TEACHER);
  });

  it('a teacher can reach none of the admin routes', async () => {
    const routes = [
      ['GET', `/teacher-earnings/${TEACHER}`], ['GET', `/teacher-earnings/${OTHER_TEACHER}/sessions`],
      ['GET', `/teacher-earnings/${TEACHER}/payments`], ['POST', `/teacher-earnings/${TEACHER}/payments`],
      ['POST', `/teacher-earnings/${TEACHER}/receipt-upload-url`], ['POST', '/teacher-earnings/resync'],
      ['GET', `/teacher-earnings/payments/${PAYMENT}/receipt`],
    ] as const;
    for (const [method, url] of routes) expect((await call({ method, url, token: 'teacher', body: BODY })).statusCode).toBe(403);
    expect(m.earnings.record).not.toHaveBeenCalled();
  });
});
