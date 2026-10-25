import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PAYMENT_ID, paymentRow, STUDENT_ID, SUB_ID } from '../subscriptions/money/money.fakes';
import { moneyApp, resetMocks, type Mocks } from '../subscriptions/test-app';

const REQUEST = '7d1c6a52-3b7e-4f0e-9a51-2f7c3e9b8a10';
const INVOICE = '1f000000-0000-4000-8000-000000000001';
const INVOICE_ROW = { rule_id: null, kind: 'package', mime: 'image/png', size_bytes: 10, source: 'upload', created_at: '2026-10-01T09:00:00Z', storage_path: 'r/x.png' };
const body = {
  subscriptionId: SUB_ID,
  amount: 145,
  currency: 'SAR',
  method: 'bank',
  paidAt: '2026-10-01T09:00:00Z',
  clientRequestId: REQUEST,
};

// R-PAY-01, rule 8: a POST whose reply was lost is retried with the same clientRequestId; the
// retry must return the payment already recorded, never book the same money twice.
describe('POST /payments retried with the same clientRequestId', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    m.payments.subscription.mockResolvedValue({ id: SUB_ID, student_id: STUDENT_ID, currency: 'SAR' });
    m.payments.insert.mockResolvedValue(paymentRow({ client_request_id: REQUEST }));
    m.payments.get.mockResolvedValue(paymentRow({ client_request_id: REQUEST }));
  });

  it('first call records it with the id; the retry returns the same payment and writes nothing', async () => {
    const first = await call({ method: 'POST', url: '/payments', body });
    expect(first.statusCode).toBe(201);
    expect(m.payments.insert).toHaveBeenCalledWith(expect.objectContaining({ client_request_id: REQUEST }));

    m.payments.insert.mockClear();
    m.audit.record.mockClear();
    m.payments.byRequest.mockResolvedValue(paymentRow({ client_request_id: REQUEST }));
    const retry = await call({ method: 'POST', url: '/payments', body });
    expect(retry.statusCode).toBe(201);
    expect(retry.json()).toMatchObject({ id: PAYMENT_ID });
    expect(m.payments.byRequest).toHaveBeenCalledWith(REQUEST);
    expect(m.payments.insert).not.toHaveBeenCalled();
    expect(m.audit.record).not.toHaveBeenCalled();
  });

  it('two sends at once: the loser hits the unique key and returns the winner, unaudited', async () => {
    m.payments.insert.mockResolvedValue(null);
    m.payments.byRequest.mockResolvedValueOnce(null).mockResolvedValueOnce(paymentRow({ client_request_id: REQUEST }));
    const res = await call({ method: 'POST', url: '/payments', body });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ id: PAYMENT_ID });
    expect(m.audit.record).not.toHaveBeenCalled();
  });

  it('a retry racing the first send past its invoice check replays it (201), and 409 only when none was booked', async () => {
    const students = [{ id: STUDENT_ID, name: 'سهيلة', code: 'AB-0183' }];
    m.invoices.get.mockResolvedValue({ ...INVOICE_ROW, id: INVOICE, students });
    m.payments.byInvoice.mockResolvedValue({ id: PAYMENT_ID });
    m.payments.byRequest.mockResolvedValueOnce(null).mockResolvedValueOnce(paymentRow({ client_request_id: REQUEST }));
    const replay = await call({ method: 'POST', url: '/payments', body: { ...body, invoiceId: INVOICE } });
    expect([replay.statusCode, replay.json().id]).toEqual([201, PAYMENT_ID]);
    expect(m.payments.insert).not.toHaveBeenCalled();
    m.payments.byRequest.mockResolvedValue(null);
    const used = await call({ method: 'POST', url: '/payments', body: { ...body, invoiceId: INVOICE } });
    expect([used.statusCode, used.json().code]).toEqual([409, 'invoice_used']);
    expect(m.payments.insert).not.toHaveBeenCalled();
  });

  it('without an id every POST is a new payment (older app builds)', async () => {
    await call({ method: 'POST', url: '/payments', body: { ...body, clientRequestId: undefined } });
    expect(m.payments.byRequest).not.toHaveBeenCalled();
    expect(m.payments.insert).toHaveBeenCalledWith(expect.objectContaining({ client_request_id: null }));
  });

  it('400 when the id is not a uuid', async () => {
    const res = await call({ method: 'POST', url: '/payments', body: { ...body, clientRequestId: 'x' } });
    expect(res.statusCode).toBe(400);
  });
});
