import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PAYMENT_ID, paymentRow } from '@/modules/finance/subscriptions/money/money.fakes';
import { moneyApp, resetMocks, type Mocks } from '@/modules/finance/subscriptions/test-app';

const URL = `/payments/${PAYMENT_ID}`;

// «تعديل المبلغ» on the admin's PATCH (owner 2026-11-02): manual payments only, audited.
describe('PATCH /payments/:id amount', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    m.payments.get.mockResolvedValue(paymentRow());
    m.payments.netPaid.mockResolvedValue(145);
    m.payments.update.mockResolvedValue(paymentRow({ amount: 100 }));
  });

  it('a bank transfer: the new amount, audited before → after, then the recompute and the bell', async () => {
    const res = await call({ method: 'PATCH', url: URL, body: { amount: 100 } });
    expect(res.statusCode).toBe(200);
    expect(m.payments.update).toHaveBeenCalledWith(PAYMENT_ID, {
      amount: 100,
      original_amount: null,
      original_currency: null,
      fx_rate: null,
    });
    expect(m.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'payments',
        action: 'update',
        before: expect.objectContaining({ amount: 145 }),
        after: expect.objectContaining({ amount: 100 }),
      }),
    );
    expect(m.subs.forStudent).toHaveBeenCalled(); // the package statuses are recomputed
    expect(m.commissionBell.notify).toHaveBeenCalled();
  });

  it('a card (Stripe) payment: 409 stripe_amount_locked, nothing written or audited', async () => {
    m.payments.get.mockResolvedValue(paymentRow({ method: 'card' }));
    const res = await call({ method: 'PATCH', url: URL, body: { amount: 100 } });
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('stripe_amount_locked');
    expect(m.payments.update).not.toHaveBeenCalled();
    expect(m.audit.record).not.toHaveBeenCalled();
  });

  it('a card payment re-sending its own amount (the edit form) still saves its note', async () => {
    m.payments.get.mockResolvedValue(paymentRow({ method: 'card' }));
    const res = await call({ method: 'PATCH', url: URL, body: { amount: 145, note: 'ملاحظة' } });
    expect(res.statusCode).toBe(200);
    expect(m.payments.update).toHaveBeenCalledWith(PAYMENT_ID, { note: 'ملاحظة' });
  });

  it('a method switch into or out of card: 409 stripe_method_locked (no two-step unlock)', async () => {
    m.payments.get.mockResolvedValue(paymentRow({ method: 'card' }));
    const out = await call({ method: 'PATCH', url: URL, body: { method: 'bank' } });
    expect(out.statusCode).toBe(409);
    expect(out.json().code).toBe('stripe_method_locked');
    m.payments.get.mockResolvedValue(paymentRow({ method: 'bank' }));
    const into = await call({ method: 'PATCH', url: URL, body: { method: 'card', amount: 9 } });
    expect(into.json().code).toBe('stripe_method_locked');
    expect(m.payments.update).not.toHaveBeenCalled();
  });

  it('a payment under the refunds already made: 409 refund_exceeds_paid', async () => {
    m.payments.netPaid.mockResolvedValue(45); // 145 paid, 100 refunded
    const res = await call({ method: 'PATCH', url: URL, body: { amount: 40 } });
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('refund_exceeds_paid');
  });

  it('refuses a zero or 3-decimal amount (400)', async () => {
    for (const amount of [0, 1.234]) {
      const res = await call({ method: 'PATCH', url: URL, body: { amount } });
      expect(res.statusCode).toBe(400);
    }
  });
});
