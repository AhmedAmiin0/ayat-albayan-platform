import { describe, expect, it } from 'vitest';
import { salesChatReceiptCopySchema, salesPaymentCreateSchema, salesQuoteSchema, salesSubscriptionCreateSchema } from './money.js';

const ID = '11111111-1111-4111-8111-111111111111';
const PAY = { subscriptionId: ID, amount: 290, currency: 'SAR', paidAt: '2026-10-11T09:00:00Z', receiptPath: `${ID}/r.jpg`, clientRequestId: ID };

describe('sales money commands (R-ASST-01/04): narrower than the admin’s', () => {
  it('a bank transfer needs its receipt and a clientRequestId', () => {
    expect(salesPaymentCreateSchema.safeParse(PAY).success).toBe(true);
    const { receiptPath: _r, ...noReceipt } = PAY;
    expect(salesPaymentCreateSchema.safeParse(noReceipt).success).toBe(false);
    const { clientRequestId: _c, ...noKey } = PAY;
    expect(salesPaymentCreateSchema.safeParse(noKey).success).toBe(false);
  });

  it('refuses the admin-only fields instead of dropping them: kind, method, invoiceId', () => {
    for (const extra of [{ kind: 'refund' }, { method: 'cash' }, { invoiceId: ID }])
      expect(salesPaymentCreateSchema.safeParse({ ...PAY, ...extra }).success).toBe(false);
  });

  it('refuses a payment dated in the future and a non-positive amount', () => {
    expect(salesPaymentCreateSchema.safeParse({ ...PAY, paidAt: new Date(Date.now() + 86_400_000).toISOString() }).success).toBe(false);
    expect(salesPaymentCreateSchema.safeParse({ ...PAY, amount: 0 }).success).toBe(false);
  });

  it('a subscription is calculator inputs only: a typed price or notes are a 400', () => {
    const body = { studentId: ID, pricing: { tier: 'standard' }, startsOn: '2026-10-12', clientRequestId: ID };
    expect(salesSubscriptionCreateSchema.safeParse(body).success).toBe(true);
    expect(salesSubscriptionCreateSchema.safeParse({ ...body, price: 1 }).success).toBe(false);
    expect(salesSubscriptionCreateSchema.safeParse({ ...body, notes: 'x' }).success).toBe(false);
    expect(salesQuoteSchema.safeParse({ studentId: ID, pricing: { count: 8 } }).success).toBe(true);
  });

  it('a chat receipt names the subscription and the message', () => {
    expect(salesChatReceiptCopySchema.safeParse({ subscriptionId: ID, messageId: ID }).success).toBe(true);
    expect(salesChatReceiptCopySchema.safeParse({ subscriptionId: ID }).success).toBe(false);
  });
});
