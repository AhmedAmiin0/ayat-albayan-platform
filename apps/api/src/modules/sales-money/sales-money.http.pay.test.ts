import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ADMIN_PAY, PAYMENT_ID, paymentRow, STUDENT_ID, SUB_ID } from './sales-money.pay.fakes';
import { moneyApp, resetMocks, SALES_A, type Mocks } from '../subscriptions/test-app';
import { PAY, RECEIPT, REQ, salesDefaults } from './sales-money.fakes';

const PAY_KEYS = ['amount', 'created_at', 'currency', 'id', 'kind', 'method', 'note', 'paid_at', 'student', 'subscription_id'];

describe('POST /sales/payments: her bank transfer through the admin’s PaymentsService, counted at once', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    salesDefaults(m);
  });

  it('recorded_by = her, method bank, kind payment, the receipt checked; the trial student is activated by her; whitelisted', async () => {
    const res = await call({ method: 'POST', url: '/sales/payments', token: 'salesA', body: PAY });
    expect(res.statusCode).toBe(201);
    expect(m.payments.insert).toHaveBeenCalledWith(
      expect.objectContaining({ subscription_id: SUB_ID, amount: 145, kind: 'payment', method: 'bank', recorded_by: SALES_A.id, receipt_path: RECEIPT, client_request_id: REQ }),
    );
    expect(m.storage.exists).toHaveBeenCalledWith({ bucket: 'receipts', path: RECEIPT });
    expect(m.audit.record).toHaveBeenCalledWith(expect.objectContaining({ actorId: SALES_A.id, entity: 'payments', action: 'create' }));
    expect(m.activation.afterPayment).toHaveBeenCalledWith(STUDENT_ID, SALES_A.id);
    expect(Object.keys(res.json()).sort()).toEqual(PAY_KEYS);
    expect(res.json()).toMatchObject({ id: PAYMENT_ID, method: 'bank', kind: 'payment', student: { id: STUDENT_ID, status: 'active' } });
  });

  it('the admin’s POST /payments activates a trial student too, with the admin as the actor; a refund does not', async () => {
    m.payments.insert.mockResolvedValue(paymentRow());
    expect((await call({ method: 'POST', url: '/payments', body: ADMIN_PAY })).statusCode).toBe(201);
    expect(m.activation.afterPayment).toHaveBeenCalledWith(STUDENT_ID, 'a0000000-0000-4000-8000-000000000001');
    m.activation.afterPayment.mockClear();
    m.payments.netPaid.mockResolvedValue(145);
    m.payments.insert.mockResolvedValue(paymentRow({ kind: 'refund' }));
    expect((await call({ method: 'POST', url: '/payments', body: { ...ADMIN_PAY, kind: 'refund' } })).statusCode).toBe(201);
    expect(m.activation.afterPayment).not.toHaveBeenCalled();
  });

  it('receipt required; kind, method or invoiceId from her body → 400; nothing recorded', async () => {
    const noReceipt = { ...PAY, receiptPath: undefined }; // dropped by JSON: no receiptPath at all
    for (const body of [noReceipt, { ...PAY, kind: 'refund' }, { ...PAY, method: 'cash' }, { ...PAY, invoiceId: REQ }])
      expect((await call({ method: 'POST', url: '/sales/payments', token: 'salesA', body })).statusCode).toBe(400);
    expect(m.payments.insert).not.toHaveBeenCalled();
  });

  it('a receipt path of another package, or never uploaded → 400 receipt_path', async () => {
    const other = await call({ method: 'POST', url: '/sales/payments', token: 'salesA', body: { ...PAY, receiptPath: 'x/y.jpg' } });
    expect(other.json().code).toBe('receipt_path');
    m.storage.exists.mockResolvedValue(false);
    expect((await call({ method: 'POST', url: '/sales/payments', token: 'salesA', body: PAY })).json().code).toBe('receipt_path');
    expect(m.payments.insert).not.toHaveBeenCalled();
  });

  it('a double click (same clientRequestId) returns the payment already recorded, nothing inserted twice', async () => {
    m.payments.byRequest.mockResolvedValue({ id: PAYMENT_ID });
    const res = await call({ method: 'POST', url: '/sales/payments', token: 'salesA', body: PAY });
    expect([res.statusCode, res.json().id]).toEqual([201, PAYMENT_ID]);
    expect(m.payments.insert).not.toHaveBeenCalled();
  });

  it('receipt-upload-url: a signed PUT under receipts/{her subscription}/; 404 for an unknown package', async () => {
    m.storage.signedUpload.mockImplementation(async (ref: { bucket: string; path: string }) => ({ ...ref, token: 't', signed_url: 'u' }));
    const res = await call({ method: 'POST', url: '/sales/payments/receipt-upload-url', token: 'salesA', body: { subscriptionId: SUB_ID, mime: 'image/png', size: 1000 } });
    expect(res.statusCode).toBe(200);
    expect(res.json().path).toMatch(new RegExp(`^${SUB_ID}/[0-9a-f-]+\\.png$`));
    m.payments.subscription.mockResolvedValue(null);
    const missing = await call({ method: 'POST', url: '/sales/payments/receipt-upload-url', token: 'salesA', body: { subscriptionId: SUB_ID, mime: 'image/png', size: 1000 } });
    expect([missing.statusCode, missing.json().code]).toEqual([404, 'subscription_not_found']);
  });
});
