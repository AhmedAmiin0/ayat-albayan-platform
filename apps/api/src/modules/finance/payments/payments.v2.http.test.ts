import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PAYMENT_ID, paymentRow, STUDENT_ID, SUB_ID } from '../subscriptions/money/money.fakes';
import { moneyApp, resetMocks, type Mocks } from '../subscriptions/test-app';

// Payments re-managed (owner, 2026-10-05): filters + period totals, refunds, invoice as receipt.

const INVOICE = '1f000000-0000-4000-8000-000000000001';
const inv = { rule_id: null, kind: 'package', mime: 'image/png', size_bytes: 10, source: 'upload', created_at: '2026-10-01T09:00:00Z', storage_path: 'r/x.png' };
const body = { subscriptionId: SUB_ID, amount: 145, currency: 'SAR', method: 'bank', paidAt: '2026-10-01T09:00:00Z' };

describe('payments v2 routes', () => {
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
    m.payments.byInvoice.mockResolvedValue(null);
    m.payments.netPaid.mockResolvedValue(145);
  });

  it('P1 filters by method and kind and returns the period totals', async () => {
    m.payments.list.mockResolvedValue({ items: [paymentRow()], total: 1, page: 1, pageSize: 25 });
    m.payments.totals.mockResolvedValue([{ currency: 'SAR', net: 95, payments: 145, refunds: 50 }]);
    const res = await call({ method: 'GET', url: '/payments?method=bank&kind=refund' });
    expect(m.payments.list).toHaveBeenCalledWith(expect.objectContaining({ method: 'bank', kind: 'refund' }));
    expect(res.json().totals).toEqual([{ currency: 'SAR', net: 95, payments: 145, refunds: 50 }]);
    expect((await call({ method: 'GET', url: '/payments?method=card' })).statusCode).toBe(400);
  });

  it('a refund («استرداد») is stored with kind refund; more than was paid is 409', async () => {
    await call({ method: 'POST', url: '/payments', body: { ...body, amount: 45, kind: 'refund' } });
    expect(m.payments.insert).toHaveBeenCalledWith(expect.objectContaining({ kind: 'refund', amount: 45 }));
    const over = await call({ method: 'POST', url: '/payments', body: { ...body, amount: 146, kind: 'refund' } });
    expect(over.json().code).toBe('refund_exceeds_paid');
  });

  it('a payment from the booking invoice links it once; another student’s invoice is 400', async () => {
    m.invoices.get.mockResolvedValue({ ...inv, id: INVOICE, students: [{ id: STUDENT_ID, name: 'سهيلة', code: 'AB-0183' }] });
    await call({ method: 'POST', url: '/payments', body: { ...body, invoiceId: INVOICE } });
    expect(m.payments.insert).toHaveBeenCalledWith(expect.objectContaining({ invoice_id: INVOICE, receipt_path: null }));
    m.payments.byInvoice.mockResolvedValue({ id: PAYMENT_ID });
    expect((await call({ method: 'POST', url: '/payments', body: { ...body, invoiceId: INVOICE } })).json().code).toBe('invoice_used');
    m.invoices.get.mockResolvedValue({ ...inv, id: INVOICE, students: [] });
    m.payments.byInvoice.mockResolvedValue(null);
    expect((await call({ method: 'POST', url: '/payments', body: { ...body, invoiceId: INVOICE } })).json().code).toBe('invoice_mismatch');
  });

  it('P7 of a payment recorded from an invoice signs the invoice file', async () => {
    m.payments.get.mockResolvedValue(paymentRow({ invoice_id: INVOICE, receipt_path: null }));
    m.invoices.get.mockResolvedValue({ ...inv, id: INVOICE, students: [] });
    m.storage.signedDownload.mockResolvedValue({ url: 'https://inv', expires_at: 'x' });
    expect((await call({ method: 'GET', url: `/payments/${PAYMENT_ID}/receipt` })).json().url).toBe('https://inv');
    expect(m.storage.signedDownload).toHaveBeenCalledWith(expect.objectContaining({ bucket: 'invoices', path: 'r/x.png' }));
  });

  it('the view carries kind, the original amount and the invoice', async () => {
    m.payments.get.mockResolvedValue(paymentRow({ original_amount: 1300, original_currency: 'EGP', fx_rate: 0.0769, invoice_id: INVOICE }));
    const res = await call({ method: 'GET', url: `/payments/${PAYMENT_ID}` });
    expect(res.json()).toMatchObject({ kind: 'payment', original: { amount: 1300, currency: 'EGP', fx_rate: 0.0769 }, invoice_id: INVOICE });
  });
});
