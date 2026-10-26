import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { moneyApp, resetMocks, type Mocks } from '../subscriptions/test-app';
import { ADMIN_PAY, attachment as file, JPEG, PAYMENT_ID, paymentRow, STUDENT_ID, SUB_ID } from '../../sales/sales-money/sales-money.pay.fakes';

const OTHER = '5c000000-0000-4000-8000-0000000000ff';
const post = (body: object) => ({ method: 'POST' as const, url: '/payments', body: { ...ADMIN_PAY, ...body } });
const patch = (body: object) => ({ method: 'PATCH' as const, url: `/payments/${PAYMENT_ID}`, body });
const ROW = { id: 'att-1', path: file(1), mime: 'image/jpeg', size: 2048, created_at: '2026-10-12T09:00:00Z' };

describe('«المرفقات»: one file, one payment; a payment with files stays a bank transfer', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    m.payments.subscription.mockResolvedValue({ id: SUB_ID, student_id: STUDENT_ID, currency: 'SAR' });
    m.payments.insert.mockResolvedValue(paymentRow());
    m.payments.get.mockResolvedValue(paymentRow());
    m.payments.update.mockResolvedValue(paymentRow());
    m.storage.info.mockResolvedValue({ size: 2048, contentType: 'image/jpeg' });
    m.storage.exists.mockResolvedValue(true);
    m.storage.head.mockResolvedValue(JPEG);
  });

  it('a file another payment holds (row or receipt) → 409 attachment_in_use, nothing written', async () => {
    m.attachments.owners.mockResolvedValue([{ path: file(2), paymentId: OTHER }]);
    const res = await call(post({ attachments: [file(1), file(2)] }));
    expect([res.statusCode, res.json().code, res.json().path]).toEqual([409, 'attachment_in_use', file(2)]);
    expect(m.attachments.owners).toHaveBeenCalledWith([file(1), file(2)]);
    const receipt = await call(post({ receiptPath: file(2) }));
    expect([receipt.statusCode, receipt.json().code]).toEqual([409, 'attachment_in_use']);
    expect(m.payments.insert).not.toHaveBeenCalled();
  });

  it('PATCH: the payment may keep its own receipt; another payment’s → 409', async () => {
    m.attachments.owners.mockResolvedValue([{ path: file(3), paymentId: PAYMENT_ID }]);
    expect((await call(patch({ receiptPath: file(3) }))).statusCode).toBe(200);
    m.attachments.owners.mockResolvedValue([{ path: file(3), paymentId: OTHER }]);
    const res = await call(patch({ receiptPath: file(3) }));
    expect([res.statusCode, res.json().code]).toEqual([409, 'attachment_in_use']);
  });

  it('a replay may re-save a path its own payment holds', async () => {
    m.payments.byRequest.mockResolvedValue(paymentRow({ client_request_id: '7d1c6a52-3b7e-4f0e-9a51-2f7c3e9b8a30' }));
    m.attachments.owners.mockResolvedValue([{ path: file(1), paymentId: PAYMENT_ID }]);
    const res = await call(post({ attachments: [file(1)], clientRequestId: '7d1c6a52-3b7e-4f0e-9a51-2f7c3e9b8a30' }));
    expect(res.statusCode).toBe(201);
    expect(m.attachments.save).toHaveBeenCalledWith([expect.objectContaining({ path: file(1) })]);
  });

  it('PATCH method away from bank with files → 400 attachments_not_allowed, nothing written', async () => {
    m.attachments.forPayment.mockResolvedValue([ROW]);
    const res = await call(patch({ method: 'cash' }));
    expect([res.statusCode, res.json().code]).toEqual([400, 'attachments_not_allowed']);
    expect(m.payments.update).not.toHaveBeenCalled();
    expect((await call(patch({ method: 'bank', note: 'x' }))).statusCode).toBe(200);
  });

  it('PATCH method away from bank without files is fine', async () => {
    const res = await call(patch({ method: 'cash' }));
    expect(res.statusCode).toBe(200);
    expect(m.payments.update).toHaveBeenCalledWith(PAYMENT_ID, { method: 'cash' });
  });
});
