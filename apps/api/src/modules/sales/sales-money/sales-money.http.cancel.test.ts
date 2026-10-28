import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SUB_ID, subRow } from '../../finance/subscriptions/money/money.fakes';
import { moneyApp, resetMocks, SALES_A, type Mocks } from '../../finance/subscriptions/test-app';
import { salesDefaults } from './sales-money.fakes';

// POST /sales/subscriptions/:id/cancel (owner 2026-10-28): her own student's package only, the admin's rules.

const url = `/sales/subscriptions/${SUB_ID}/cancel`;
const cancelled = subRow({ status: 'cancelled', cancelled_by: SALES_A.id });

describe('POST /sales/subscriptions/:id/cancel', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    salesDefaults(m);
    m.subs.get.mockReset().mockResolvedValueOnce(subRow()).mockResolvedValue(cancelled);
    m.cancels.cancel.mockResolvedValue({ row: cancelled });
  });

  it('her student: cancelled with her as the actor; her whitelisted view, never owed', async () => {
    const res = await call({ method: 'POST', url, token: 'salesA', body: { reason: 'أُنشئت بالخطأ' } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: SUB_ID, status: 'cancelled', due: 0 });
    expect(res.json()).not.toHaveProperty('notes');
    expect(m.cancels.cancel).toHaveBeenCalledWith(expect.objectContaining({ actorId: SALES_A.id, reason: 'أُنشئت بالخطأ' }));
  });

  it('another salesperson’s student → 403 not_your_student, nothing read or written past the package', async () => {
    const res = await call({ method: 'POST', url, token: 'salesB' });
    expect([res.statusCode, res.json().code]).toEqual([403, 'not_your_student']);
    expect(m.cancels.linkedLessons).not.toHaveBeenCalled();
    expect(m.cancels.cancel).not.toHaveBeenCalled();
  });

  it('an unknown package → 404 subscription_not_found', async () => {
    m.subs.get.mockReset().mockResolvedValue(null);
    const res = await call({ method: 'POST', url, token: 'salesA' });
    expect([res.statusCode, res.json().code]).toEqual([404, 'subscription_not_found']);
  });

  it('the admin rules hold for her: 409 has_payments', async () => {
    m.subs.paid.mockResolvedValue(new Map([[SUB_ID, 145]]));
    const res = await call({ method: 'POST', url, token: 'salesA' });
    expect([res.statusCode, res.json().code]).toEqual([409, 'has_payments']);
    expect(m.cancels.cancel).not.toHaveBeenCalled();
  });

  it('the admin and a teacher use the admin route (403 here)', async () => {
    for (const token of ['admin', 'teacher'] as const) expect((await call({ method: 'POST', url, token })).statusCode).toBe(403);
  });
});
