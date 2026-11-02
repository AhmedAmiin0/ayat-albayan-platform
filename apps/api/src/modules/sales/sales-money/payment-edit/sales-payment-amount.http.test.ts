import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { systemResolver } from '@/common/auth/auth.guard';
import type { PermissionResolver } from '@/common/auth/permissions';
import { PAYMENT_ID, paymentRow } from '@/modules/finance/subscriptions/money/money.fakes';
import { moneyApp, resetMocks, SALES_B, type Mocks } from '@/modules/finance/subscriptions/test-app';
import { salesDefaults } from '@/modules/sales/sales-money/sales-money.fakes';

// «تعديل المبلغ» by the assistant (owner 2026-11-02): payments.edit_amount, never payments.write.
const URL = `/sales/payments/${PAYMENT_ID}/amount`;
const withEdit: PermissionResolver = async (user) => [
  ...(await systemResolver(user)),
  ...(user.role === 'sales' ? ['payments.edit_amount' as const] : []),
];

describe('PATCH /sales/payments/:id/amount', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp(withEdit)));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    salesDefaults(m);
    m.payments.netPaid.mockResolvedValue(145);
    m.payments.update.mockResolvedValue(paymentRow({ amount: 120 }));
  });

  it('any student (salesB owns none): the admin’s update with her as actor, audited, whitelisted', async () => {
    const before = paymentRow();
    m.payments.get.mockResolvedValueOnce(before).mockResolvedValueOnce(before);
    m.payments.get.mockResolvedValue(paymentRow({ amount: 120 }));
    const res = await call({ method: 'PATCH', url: URL, token: 'salesB', body: { amount: 120 } });
    expect(res.statusCode).toBe(200);
    const write = expect.objectContaining({ amount: 120 });
    expect(m.payments.update).toHaveBeenCalledWith(PAYMENT_ID, write);
    expect(m.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: SALES_B.id, entity: 'payments', action: 'update' }),
    );
    expect(m.commissionBell.notify).toHaveBeenCalled();
    expect(res.json()).toMatchObject({ id: PAYMENT_ID, amount: 120 });
    expect(res.json()).not.toHaveProperty('recorded_by');
  });

  it('a card (Stripe) payment: 409 stripe_amount_locked, even with its own amount', async () => {
    m.payments.get.mockResolvedValue(paymentRow({ method: 'card' }));
    for (const amount of [120, 145]) {
      const res = await call({ method: 'PATCH', url: URL, token: 'salesA', body: { amount } });
      expect(res.statusCode).toBe(409);
      expect(res.json().code).toBe('stripe_amount_locked');
    }
    expect(m.payments.update).not.toHaveBeenCalled();
  });

  it('a refund: 403 refund_not_allowed', async () => {
    m.payments.get.mockResolvedValue(paymentRow({ kind: 'refund' }));
    const res = await call({ method: 'PATCH', url: URL, token: 'salesA', body: { amount: 10 } });
    expect(res.statusCode).toBe(403);
    expect(res.json().code).toBe('refund_not_allowed');
  });

  it('the amount only: another field is a 400', async () => {
    const res = await call({ method: 'PATCH', url: URL, token: 'salesA', body: { amount: 1, note: 'x' } });
    expect(res.statusCode).toBe(400);
  });

  it('she still has no PATCH /payments/:id (payments.write)', async () => {
    const url = `/payments/${PAYMENT_ID}`;
    const res = await call({ method: 'PATCH', url, token: 'salesA', body: { amount: 1 } });
    expect(res.statusCode).toBe(403);
  });
});

describe('PATCH /sales/payments/:id/amount without payments.edit_amount', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());

  it('the system sales role: 403, nothing read or written', async () => {
    resetMocks(m);
    const res = await call({ method: 'PATCH', url: URL, token: 'salesA', body: { amount: 120 } });
    expect(res.statusCode).toBe(403);
    expect(m.payments.get).not.toHaveBeenCalled();
    expect(m.payments.update).not.toHaveBeenCalled();
  });
});
