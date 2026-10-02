import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PAYMENT_ID, paymentRow, STUDENT_ID, SUB_ID, subRow } from '../subscriptions/money.fakes';
import { moneyApp, resetMocks, type Mocks } from '../subscriptions/test-app';

const SUB = { id: SUB_ID, student_id: STUDENT_ID, currency: 'SAR' };
const RECEIPT = `${SUB_ID}/0f0e0d0c-0000-4000-8000-000000000001.jpg`;
const body = { subscriptionId: SUB_ID, amount: 145, currency: 'SAR', method: 'bank', paidAt: '2026-10-01T09:00:00Z' };

describe('payments routes (P1–P7, R-PAY-01)', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    m.payments.subscription.mockResolvedValue(SUB);
    m.payments.insert.mockResolvedValue(paymentRow());
    m.payments.get.mockResolvedValue(paymentRow());
  });

  it('P2 (journey 3): a full payment is recorded by the admin and the package becomes active', async () => {
    m.subs.forStudent.mockResolvedValue([subRow()]);
    m.subs.paid.mockResolvedValue(new Map([[SUB_ID, 145]]));
    m.payments.recorders.mockResolvedValue(new Map([['a0000000-0000-4000-8000-000000000001', 'مدير']]));
    const res = await call({ method: 'POST', url: '/payments', body: { ...body, receiptPath: null } });
    expect(res.statusCode).toBe(201);
    expect(m.payments.insert).toHaveBeenCalledWith(
      expect.objectContaining({ subscription_id: SUB_ID, amount: 145, recorded_by: 'a0000000-0000-4000-8000-000000000001' }),
    );
    expect(m.subs.update).toHaveBeenCalledWith(SUB_ID, { status: 'active' });
    expect(res.json()).toMatchObject({ id: PAYMENT_ID, student: { name: 'سهيلة' }, recorded_by: { full_name: 'مدير' } });
  });

  it('P2: 400 currency_mismatch with the package currency', async () => {
    const res = await call({ method: 'POST', url: '/payments', body: { ...body, currency: 'EGP' } });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'currency_mismatch', currency: 'SAR' });
    expect(m.payments.insert).not.toHaveBeenCalled();
  });

  it('P2: a receipt path of another package, or never uploaded → 400 receipt_path', async () => {
    const other = await call({ method: 'POST', url: '/payments', body: { ...body, receiptPath: 'x/y.jpg' } });
    expect(other.json().code).toBe('receipt_path');
    m.storage.exists.mockResolvedValue(false);
    const missing = await call({ method: 'POST', url: '/payments', body: { ...body, receiptPath: RECEIPT } });
    expect(missing.json().code).toBe('receipt_path');
    m.storage.exists.mockResolvedValue(true);
    const ok = await call({ method: 'POST', url: '/payments', body: { ...body, receiptPath: RECEIPT } });
    expect(ok.statusCode).toBe(201);
  });

  it('P2: 404 subscription_not_found; a future date is refused', async () => {
    const future = await call({ method: 'POST', url: '/payments', body: { ...body, paidAt: '2099-01-01T00:00:00Z' } });
    expect(future.json().issues[0].message).toBe('paid_at_future');
    m.payments.subscription.mockResolvedValue(null);
    const res = await call({ method: 'POST', url: '/payments', body });
    expect(res.json()).toMatchObject({ code: 'subscription_not_found' });
  });

  it('P1: local Riyadh days become a half-open UTC window', async () => {
    m.payments.list.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 25 });
    const res = await call({ method: 'GET', url: `/payments?studentId=${STUDENT_ID}&from=2026-09-01&to=2026-09-30` });
    expect(res.statusCode).toBe(200);
    expect(m.payments.list).toHaveBeenCalledWith({
      page: 1,
      pageSize: 25,
      studentId: STUDENT_ID,
      from: '2026-08-31T21:00:00.000Z',
      to: '2026-09-30T21:00:00.000Z',
    });
  });

  it('P6: a signed upload URL under the package; wrong type → receipt_type', async () => {
    m.storage.signedUpload.mockResolvedValue({ bucket: 'receipts', path: RECEIPT, token: 't', signed_url: 'u' });
    const res = await call({
      method: 'POST',
      url: '/payments/receipt-upload-url',
      body: { subscriptionId: SUB_ID, mime: 'image/jpeg', size: 1000 },
    });
    expect(res.statusCode).toBe(200);
    const ref = m.storage.signedUpload.mock.calls[0]?.[0] as { bucket: string; path: string };
    expect(ref.bucket).toBe('receipts');
    expect(ref.path).toMatch(new RegExp(`^${SUB_ID}/[0-9a-f-]{36}\\.jpg$`));
    const bad = await call({
      method: 'POST',
      url: '/payments/receipt-upload-url',
      body: { subscriptionId: SUB_ID, mime: 'audio/mpeg', size: 1000 },
    });
    expect(bad.json().issues[0].message).toBe('receipt_type');
  });

  it('P7: 404 receipt_not_found without a receipt; a signed URL otherwise', async () => {
    const none = await call({ method: 'GET', url: `/payments/${PAYMENT_ID}/receipt` });
    expect(none.json().code).toBe('receipt_not_found');
    m.payments.get.mockResolvedValue(paymentRow({ receipt_path: RECEIPT }));
    m.storage.signedDownload.mockResolvedValue({ url: 'https://x', expires_at: '2026-10-02T10:00:00Z' });
    const res = await call({ method: 'GET', url: `/payments/${PAYMENT_ID}/receipt` });
    expect(res.json()).toEqual({ url: 'https://x', expires_at: '2026-10-02T10:00:00Z' });
  });

  it('P4/P5: edits are audited and recomputed; delete removes the receipt', async () => {
    m.payments.update.mockResolvedValue(paymentRow({ amount: 100 }));
    const res = await call({ method: 'PATCH', url: `/payments/${PAYMENT_ID}`, body: { amount: 100 } });
    expect(res.statusCode).toBe(200);
    expect(m.payments.update).toHaveBeenCalledWith(PAYMENT_ID, { amount: 100 });
    m.payments.get.mockResolvedValue(paymentRow({ receipt_path: RECEIPT }));
    expect((await call({ method: 'DELETE', url: `/payments/${PAYMENT_ID}` })).statusCode).toBe(204);
    expect(m.storage.remove).toHaveBeenCalledWith({ bucket: 'receipts', path: RECEIPT });
    expect(m.audit.record).toHaveBeenCalledWith(expect.objectContaining({ entity: 'payments', action: 'delete' }));
  });

  it('teachers are refused', async () => {
    expect((await call({ method: 'GET', url: '/payments', token: 'teacher' })).statusCode).toBe(403);
  });
});
