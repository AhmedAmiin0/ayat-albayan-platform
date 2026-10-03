import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { moneyApp, resetMocks, type Mocks } from '../subscriptions/test-app';
import { E, earning, paymentRow, PAYMENT, REQ, T1, T2 } from './earnings.fakes';

const BODY = { amount: 150, method: 'bank', paidAt: '2026-09-20T10:00:00Z', clientRequestId: REQ };
const URL = `/teachers/${T1}/earnings`;

describe('teacher earnings, admin routes (docs/11 §8b)', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    m.earnings.teacher.mockResolvedValue({ id: T1, display_name_ar: 'أبرار' });
    m.earnings.earnings.mockResolvedValue([earning(3, 12), earning(1, 3), earning(2, 8, { paid: 30, outstanding: 60, status: 'partially_paid' })]);
    m.earnings.record.mockResolvedValue({ payment_id: PAYMENT, replayed: false });
    m.earnings.payment.mockResolvedValue(paymentRow());
  });

  it('GET: earned / paid / outstanding and every session', async () => {
    const res = await call({ method: 'GET', url: URL });
    expect(res.statusCode).toBe(200);
    expect(res.json().balance).toEqual({ earned: 270, paid: 30, outstanding: 240, sessions: 3, open_sessions: 3, currency: 'EGP' });
    expect(res.json().sessions).toHaveLength(3);
    expect((await call({ method: 'GET', url: URL.replace(T1, T2) })).statusCode).toBe(200);
  });

  it('404 teacher_not_found for an unknown teacher', async () => {
    m.earnings.teacher.mockResolvedValue(null);
    const res = await call({ method: 'GET', url: URL });
    expect(res.statusCode).toBe(404);
    expect(res.json().code).toBe('teacher_not_found');
  });

  it('POST pays the oldest sessions first, partially on the last one', async () => {
    const res = await call({ method: 'POST', url: `${URL}/payments`, body: BODY });
    expect(res.statusCode).toBe(201);
    const payload = m.earnings.record.mock.calls[0]?.[0];
    expect(payload).toMatchObject({ teacher_id: T1, amount: 150, client_request_id: REQ });
    expect(payload.items).toEqual([
      { earning_id: E(1), amount: 90 },
      { earning_id: E(2), amount: 60 },
    ]);
    expect(res.json()).toMatchObject({ id: PAYMENT, sessions: 2, has_receipt: false, from_payout: false });
  });

  it('POST pays only the ticked sessions; a partial amount is allowed', async () => {
    await call({ method: 'POST', url: `${URL}/payments`, body: { ...BODY, amount: 40, earningIds: [E(3)] } });
    expect(m.earnings.record.mock.calls[0]?.[0].items).toEqual([{ earning_id: E(3), amount: 40 }]);
  });

  it('POST refuses an over-payment (400, nothing recorded) and a session of another teacher (404)', async () => {
    const over = await call({ method: 'POST', url: `${URL}/payments`, body: { ...BODY, amount: 240.01 } });
    expect(over.statusCode).toBe(400);
    expect(over.json().code).toBe('over_payment');
    const ticked = await call({ method: 'POST', url: `${URL}/payments`, body: { ...BODY, amount: 10, earningIds: [E(9)] } });
    expect(ticked.statusCode).toBe(404);
    expect(ticked.json().code).toBe('earning_not_found');
    expect(m.earnings.record).not.toHaveBeenCalled();
  });

  it('POST 400 nothing_due when every session is settled, and validates the body', async () => {
    m.earnings.earnings.mockResolvedValue([earning(1, 3, { paid: 90, outstanding: 0, status: 'paid' })]);
    expect((await call({ method: 'POST', url: `${URL}/payments`, body: BODY })).json().code).toBe('nothing_due');
    for (const bad of [{ ...BODY, amount: 0 }, { ...BODY, amount: 1.234 }, { ...BODY, clientRequestId: undefined }, { ...BODY, method: 'x' }]) {
      expect((await call({ method: 'POST', url: `${URL}/payments`, body: bad })).statusCode).toBe(400);
    }
  });

  it('POST is idempotent: a retried form returns the payment it recorded, never a second one', async () => {
    m.earnings.byRequest.mockResolvedValue(paymentRow());
    const res = await call({ method: 'POST', url: `${URL}/payments`, body: BODY });
    expect(res.json().id).toBe(PAYMENT);
    expect(m.earnings.record).not.toHaveBeenCalled();
    m.earnings.byRequest.mockResolvedValue(paymentRow({ teacher_id: T2 }));
    expect((await call({ method: 'POST', url: `${URL}/payments`, body: BODY })).json().code).toBe('client_request_reused');
  });

  it('POST: a receipt path must be this teacher\'s and already uploaded', async () => {
    m.storage.exists.mockResolvedValue(false);
    const body = { ...BODY, receiptPath: `${T1}/a.png` };
    expect((await call({ method: 'POST', url: `${URL}/payments`, body })).json().code).toBe('receipt_path');
    m.storage.exists.mockResolvedValue(true);
    expect((await call({ method: 'POST', url: `${URL}/payments`, body: { ...BODY, receiptPath: `${T2}/a.png` } })).json().code).toBe('receipt_path');
    expect((await call({ method: 'POST', url: `${URL}/payments`, body })).statusCode).toBe(201);
  });

  it('receipt upload URL lives under the teacher\'s folder; download needs the teacher\'s own payment', async () => {
    m.storage.signedUpload.mockResolvedValue({ bucket: 'receipts', path: 'p', token: 't', signed_url: 'u' });
    const up = await call({ method: 'POST', url: `${URL}/receipt-upload-url`, body: { mime: 'image/png', size: 1000 } });
    expect(up.statusCode).toBe(200);
    expect(m.storage.signedUpload.mock.calls[0]?.[0].path.startsWith(`${T1}/`)).toBe(true);
    expect((await call({ method: 'POST', url: `${URL}/receipt-upload-url`, body: { mime: 'text/html', size: 1 } })).statusCode).toBe(400);
    m.earnings.payment.mockResolvedValue(paymentRow({ receipt_path: `${T1}/r.png` }));
    m.storage.signedDownload.mockResolvedValue({ url: 'https://x', expires_at: 'z' });
    expect((await call({ method: 'GET', url: `${URL}/payments/${PAYMENT}/receipt` })).statusCode).toBe(200);
    m.earnings.payment.mockResolvedValue(paymentRow({ receipt_path: `${T1}/r.png`, teacher_id: T2 }));
    expect((await call({ method: 'GET', url: `${URL}/payments/${PAYMENT}/receipt` })).statusCode).toBe(404);
  });

  it('GET payments lists the history; every admin route is closed to a teacher', async () => {
    m.earnings.payments.mockResolvedValue([paymentRow()]);
    expect((await call({ method: 'GET', url: `${URL}/payments` })).json()).toHaveLength(1);
    for (const [method, url] of [['GET', URL], ['GET', `${URL}/payments`], ['POST', `${URL}/payments`]] as const)
      expect((await call({ method, url, token: 'teacher', body: BODY })).statusCode).toBe(403);
  });
});
