import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { moneyApp, resetMocks, SALES_A, SALES_B, type Mocks } from '../subscriptions/test-app';
import { PAY, salesDefaults } from './sales-money.fakes';
import { attachment, JPEG, PAYMENT_ID, paymentRow } from './sales-money.pay.fakes';

const NO_RECEIPT = { ...PAY, receiptPath: undefined }; // dropped by JSON: no receiptPath at all
const OWN_URL = `/sales/me/payments/${PAYMENT_ID}/attachments`;

describe('the salesperson’s transfer files (owner 2026-10-12, docs/16 row 25)', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    salesDefaults(m);
    m.storage.info.mockResolvedValue({ size: 1000, contentType: 'image/jpeg' });
    m.storage.head.mockResolvedValue(JPEG);
    m.storage.signedDownload.mockResolvedValue({ url: 'https://s/x', expires_at: '2026-10-12T11:00:00Z' });
  });

  it('no receipt and no files: recorded (old students have none)', async () => {
    const res = await call({ method: 'POST', url: '/sales/payments', token: 'salesA', body: NO_RECEIPT });
    expect(res.statusCode).toBe(201);
    expect(m.payments.insert).toHaveBeenCalledWith(expect.objectContaining({ receipt_path: null, method: 'bank', recorded_by: SALES_A.id }));
    expect(m.attachments.save).not.toHaveBeenCalled();
  });

  it('her files are checked and saved with her as creator (method forced bank)', async () => {
    const body = { ...NO_RECEIPT, attachments: [attachment(1), attachment(2)] };
    expect((await call({ method: 'POST', url: '/sales/payments', token: 'salesA', body })).statusCode).toBe(201);
    expect(m.attachments.save).toHaveBeenCalledWith([
      expect.objectContaining({ path: attachment(1), mime: 'image/jpeg', created_by: SALES_A.id }),
      expect.objectContaining({ path: attachment(2), mime: 'image/jpeg', created_by: SALES_A.id }),
    ]);
  });

  it('a file outside her package folder → 400 attachment_path, nothing recorded', async () => {
    const body = { ...NO_RECEIPT, attachments: ['5b000000-0000-4000-8000-0000000000ff/x.jpg'] };
    const res = await call({ method: 'POST', url: '/sales/payments', token: 'salesA', body });
    expect([res.statusCode, res.json().code]).toEqual([400, 'attachment_path']);
    expect(m.payments.insert).not.toHaveBeenCalled();
  });

  it('GET /sales/me/payments/:id/attachments: her own payment, legacy receipt first', async () => {
    m.attachments.forPayment.mockResolvedValue([{ id: 'att-1', path: attachment(1), mime: 'image/jpeg', size: 1000, created_at: '2026-10-12T09:00:00Z' }]);
    const res = await call({ method: 'GET', url: OWN_URL, token: 'salesA' });
    expect(res.statusCode).toBe(200);
    expect(res.json().map((v: { id: string; legacy: boolean }) => [v.id, v.legacy])).toEqual([['receipt', true], ['att-1', false]]);
  });

  it('another salesperson’s (or the admin’s) payment → 404 payment_not_found; nothing signed', async () => {
    const other = await call({ method: 'GET', url: OWN_URL, token: 'salesB' });
    expect([other.statusCode, other.json().code]).toEqual([404, 'payment_not_found']);
    m.payments.get.mockResolvedValue(paymentRow({ recorded_by: SALES_B.id }));
    expect((await call({ method: 'GET', url: OWN_URL, token: 'salesA' })).statusCode).toBe(404);
    m.payments.get.mockResolvedValue(null);
    expect((await call({ method: 'GET', url: OWN_URL, token: 'salesA' })).statusCode).toBe(404);
    expect(m.storage.signedDownload).not.toHaveBeenCalled();
  });

  it('the admin and a teacher are refused on her route (self.sales_payments)', async () => {
    for (const token of ['admin', 'teacher'] as const)
      expect((await call({ method: 'GET', url: OWN_URL, token })).statusCode).toBe(403);
  });
});
