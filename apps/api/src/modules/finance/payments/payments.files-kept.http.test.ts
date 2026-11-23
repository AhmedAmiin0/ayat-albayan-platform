import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { moneyApp, resetMocks, type Mocks } from '@/modules/finance/subscriptions/test-app';
import { attachment, JPEG, PAYMENT_ID, paymentRow } from '@/modules/sales/sales-money/sales-money.pay.fakes';

const OLD = attachment(8);
const NEW = attachment(9);
const ROWS = [{ id: 'att-1', path: attachment(1), mime: 'image/jpeg', size: 2048, created_at: '2026-10-12T09:00:00Z' }];

describe('payment files outlive their row (R-PAY-01, R-NFR-03)', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    m.payments.get.mockResolvedValue(paymentRow({ receipt_path: OLD }));
    m.payments.update.mockResolvedValue(paymentRow({ receipt_path: NEW }));
    m.attachments.forPayment.mockResolvedValue(ROWS);
    m.storage.exists.mockResolvedValue(true);
    m.storage.info.mockResolvedValue({ size: 2048, contentType: 'image/jpeg' });
    m.storage.head.mockResolvedValue(JPEG);
  });

  it('delete removes the row and audits it, but leaves the receipt and every attachment', async () => {
    expect((await call({ method: 'DELETE', url: `/payments/${PAYMENT_ID}` })).statusCode).toBe(204);
    expect(m.payments.remove).toHaveBeenCalledWith(PAYMENT_ID);
    const before = expect.objectContaining({ receipt_path: OLD });
    expect(m.audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'delete', before }));
    expect(m.storage.remove).not.toHaveBeenCalled();
  });

  it('a receipt replace keeps the old object; its path stays in the audit before row', async () => {
    const res = await call({ method: 'PATCH', url: `/payments/${PAYMENT_ID}`, body: { receiptPath: NEW } });
    expect(res.statusCode).toBe(200);
    expect(m.payments.update).toHaveBeenCalledWith(PAYMENT_ID, { receipt_path: NEW });
    const before = expect.objectContaining({ receipt_path: OLD });
    expect(m.audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'update', before }));
    expect(m.storage.remove).not.toHaveBeenCalled();
  });
});
