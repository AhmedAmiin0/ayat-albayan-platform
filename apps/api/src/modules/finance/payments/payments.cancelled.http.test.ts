import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PAYMENT_ID, paymentRow, STUDENT_ID, SUB_ID } from '../subscriptions/money/money.fakes';
import { moneyApp, resetMocks, type Mocks } from '../subscriptions/test-app';

// An unused-cancelled package (owner 2026-10-28) takes no money: 409 before anything is written (migration 934
// too). A stopped one (2026-10-30, migration 991) keeps taking it.

const body = { subscriptionId: SUB_ID, amount: 145, currency: 'SAR', method: 'bank', paidAt: '2026-10-01T09:00:00Z' };

describe('POST /payments on a cancelled package', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => resetMocks(m));

  it('409 subscription_cancelled; nothing inserted', async () => {
    m.payments.subscription.mockResolvedValue({ id: SUB_ID, student_id: STUDENT_ID, currency: 'SAR', status: 'cancelled', cancel_kind: 'unused' });
    const res = await call({ method: 'POST', url: '/payments', body });
    expect([res.statusCode, res.json().code]).toEqual([409, 'subscription_cancelled']);
    expect(m.payments.insert).not.toHaveBeenCalled();
  });

  it('a STOPPED package (owner 2026-10-30, migration 991) still takes the money it is owed', async () => {
    const stopped = { id: SUB_ID, student_id: STUDENT_ID, currency: 'SAR', status: 'cancelled' as const, cancel_kind: 'stopped' };
    m.payments.subscription.mockResolvedValue(stopped);
    const res = await call({ method: 'POST', url: '/payments', body });
    expect(res.json().code).not.toBe('subscription_cancelled');
    expect(m.payments.insert).toHaveBeenCalled();
  });
});

describe('PATCH / DELETE /payments/:id on a cancelled package', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    const row = paymentRow();
    m.payments.get.mockResolvedValue({ ...row, subscription: row.subscription && { ...row.subscription, status: 'cancelled', cancel_kind: 'unused' } });
  });

  it('its money is frozen: 409 subscription_cancelled, nothing changed', async () => {
    const edit = await call({ method: 'PATCH', url: `/payments/${PAYMENT_ID}`, body: { amount: 10 } });
    expect([edit.statusCode, edit.json().code]).toEqual([409, 'subscription_cancelled']);
    const del = await call({ method: 'DELETE', url: `/payments/${PAYMENT_ID}` });
    expect([del.statusCode, del.json().code]).toEqual([409, 'subscription_cancelled']);
    expect(m.payments.update).not.toHaveBeenCalled();
    expect(m.payments.remove).not.toHaveBeenCalled();
  });
});
