import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { STUDENT_ID, SUB_ID, subRow } from '@/modules/finance/subscriptions/money/money.fakes';
import { moneyApp, resetMocks, SALES_B, type Mocks } from '@/modules/finance/subscriptions/test-app';
import { salesDefaults } from '@/modules/sales/sales-money/sales-money.fakes';

// POST /sales/packages/:id/cancel «إلغاء الباقة» by the assistant (owner 2026-11-02): ANY student,
// the admin's rules, write, audit and recompute (SubscriptionCancel).

const url = `/sales/packages/${SUB_ID}/cancel`;
const cancelled = subRow({ status: 'cancelled', cancelled_by: SALES_B.id });

describe('POST /sales/packages/:id/cancel', () => {
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

  it('an assistant cancels ANY student’s unused package (salesB owns none)', async () => {
    const body = { reason: 'أُنشئت بالخطأ' };
    const res = await call({ method: 'POST', url, token: 'salesB', body });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ id: SUB_ID, status: 'cancelled' });
    const write = { id: SUB_ID, actorId: SALES_B.id, reason: 'أُنشئت بالخطأ', now: expect.any(Date) };
    expect(m.cancels.cancel).toHaveBeenCalledWith(write);
    const audit = { actorId: SALES_B.id, entity: 'subscriptions', entityId: SUB_ID, action: 'cancel' };
    expect(m.audit.record).toHaveBeenCalledWith(expect.objectContaining(audit));
    const tasks = expect.objectContaining({ subjectIds: [SUB_ID] });
    expect(m.alerts.closeTasks).toHaveBeenCalledWith(tasks);
    expect(m.subs.forStudent).toHaveBeenCalledWith(STUDENT_ID);
    expect(m.sales.ownership).not.toHaveBeenCalled();
  });

  it('no body: the reason is null', async () => {
    expect((await call({ method: 'POST', url, token: 'salesA' })).statusCode).toBe(200);
    expect(m.cancels.cancel).toHaveBeenCalledWith(expect.objectContaining({ reason: null }));
  });

  it('409 has_payments: nothing written or audited', async () => {
    m.subs.paid.mockResolvedValue(new Map([[SUB_ID, 50]]));
    const res = await call({ method: 'POST', url, token: 'salesA' });
    expect([res.statusCode, res.json().code]).toEqual([409, 'has_payments']);
    expect(m.cancels.cancel).not.toHaveBeenCalled();
    expect(m.audit.record).not.toHaveBeenCalled();
  });

  it('409 has_lessons: a lesson on its course', async () => {
    m.cancels.linkedLessons.mockResolvedValue(1);
    const res = await call({ method: 'POST', url, token: 'salesA' });
    expect([res.statusCode, res.json().code]).toEqual([409, 'has_lessons']);
    expect(m.cancels.cancel).not.toHaveBeenCalled();
  });

  it('409 has_commission: a later package earned its commission because of this one', async () => {
    m.cancels.laterCommission.mockResolvedValue(true);
    const res = await call({ method: 'POST', url, token: 'salesA' });
    expect([res.statusCode, res.json().code]).toEqual([409, 'has_commission']);
    expect(m.cancels.cancel).not.toHaveBeenCalled();
  });

  it('409 already_cancelled: as read, or lost to a racing cancel', async () => {
    m.subs.get.mockReset().mockResolvedValue(cancelled);
    expect((await call({ method: 'POST', url, token: 'salesA' })).json().code).toBe('already_cancelled');
    m.subs.get.mockReset().mockResolvedValue(subRow());
    m.cancels.cancel.mockResolvedValue({ row: null, block: 'already_cancelled' });
    const res = await call({ method: 'POST', url, token: 'salesA' });
    expect([res.statusCode, res.json().code]).toEqual([409, 'already_cancelled']);
    expect(m.audit.record).not.toHaveBeenCalled();
  });

  it('404 subscription_not_found; 400 an unknown body key', async () => {
    m.subs.get.mockReset().mockResolvedValue(null);
    const res = await call({ method: 'POST', url, token: 'salesA' });
    expect([res.statusCode, res.json().code]).toEqual([404, 'subscription_not_found']);
    const bad = await call({ method: 'POST', url, token: 'salesA', body: { price: 0 } });
    expect(bad.statusCode).toBe(400);
  });
});
