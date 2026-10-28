import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { STUDENT_ID, SUB_ID, subRow } from '../money/money.fakes';
import type { BalanceRow } from '../money/balance.queries';
import { moneyApp, resetMocks, type Mocks } from '../test-app';

// «إلغاء الباقة» review (owner 2026-10-28): lessons a package used FIFO (v_subscription_balance) block the
// cancel even on rules without subscription_id; future lessons merely projected into it do not; nor may an
// earlier package be cancelled once a later one earned its commission as a renewal because of it.

const url = `/subscriptions/${SUB_ID}/cancel`;
const balance = (patch: Partial<BalanceRow>): Map<string, BalanceRow> =>
  new Map([[SUB_ID, { subscription_id: SUB_ID, student_id: STUDENT_ID, is_last: false, lessons_total: 8, lessons_used: 0, remaining: 8, ended_at: null, projected_end_at: null, ...patch }]]);

describe('POST /subscriptions/:id/cancel: FIFO lessons and a later commission', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    m.subs.get.mockResolvedValue(subRow());
    m.cancels.cancel.mockResolvedValue({ row: subRow({ status: 'cancelled' }) });
  });

  it('an admin-booked student with held lessons (no course rule of it) → 409 has_lessons, nothing written', async () => {
    m.balances.forSubscriptions.mockResolvedValue(balance({ lessons_used: 3, remaining: 5 }));
    const res = await call({ method: 'POST', url });
    expect([res.statusCode, res.json().code]).toEqual([409, 'has_lessons']);
    expect(m.cancels.cancel).not.toHaveBeenCalled();
  });

  it('a mistaken duplicate with only future projected lessons → cancelled (they move to the other package)', async () => {
    m.balances.forSubscriptions.mockResolvedValue(balance({ projected_end_at: '2026-11-20T15:00:00Z' }));
    expect((await call({ method: 'POST', url })).statusCode).toBe(200);
    expect(m.cancels.cancel).toHaveBeenCalled();
  });

  it('pay B, then cancel A → 409 has_commission (B stays a renewal otherwise), nothing written', async () => {
    m.cancels.laterCommission.mockResolvedValue(true);
    const res = await call({ method: 'POST', url });
    expect([res.statusCode, res.json().code]).toEqual([409, 'has_commission']);
    expect(m.cancels.laterCommission).toHaveBeenCalledWith({ id: SUB_ID, studentId: STUDENT_ID, createdAt: expect.any(String) });
    expect(m.cancels.cancel).not.toHaveBeenCalled();
  });

  it('a free package never asks for a later commission; the DB guard\'s has_commission is answered too', async () => {
    m.subs.get.mockResolvedValue(subRow({ price: 0 }));
    m.cancels.cancel.mockResolvedValue({ row: null, block: 'has_commission' });
    expect((await call({ method: 'POST', url })).json().code).toBe('has_commission');
    expect(m.cancels.laterCommission).not.toHaveBeenCalled();
  });
});
