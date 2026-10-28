import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { STUDENT_ID, SUB_ID, subRow } from '../money/money.fakes';
import { ADMIN, moneyApp, resetMocks, type Mocks } from '../test-app';

// POST /subscriptions/:id/cancel «إلغاء الباقة» (owner 2026-10-28): never a delete; only a package nothing hangs on.

const url = `/subscriptions/${SUB_ID}/cancel`;
const cancelled = subRow({ status: 'cancelled', cancelled_at: '2026-10-28T09:00:00Z', cancelled_by: ADMIN.id, cancel_reason: 'خطأ' });

describe('POST /subscriptions/:id/cancel', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    m.subs.get.mockResolvedValueOnce(subRow()).mockResolvedValue(cancelled);
    m.cancels.cancel.mockResolvedValue({ row: cancelled });
  });

  it('cancels: the row stays with who / when / why, audited, its tasks closed, the student recomputed', async () => {
    const res = await call({ method: 'POST', url, body: { reason: '  خطأ ' } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: SUB_ID, status: 'cancelled', balance: { remaining: 0 } });
    expect(m.cancels.cancel).toHaveBeenCalledWith({ id: SUB_ID, actorId: ADMIN.id, reason: 'خطأ', now: expect.any(Date) });
    expect(m.audit.record).toHaveBeenCalledWith(expect.objectContaining({ entity: 'subscriptions', entityId: SUB_ID, action: 'cancel' }));
    expect(m.alerts.closeTasks).toHaveBeenCalledWith(expect.objectContaining({ subjectIds: [SUB_ID], keep: [] }));
    expect(m.subs.forStudent).toHaveBeenCalledWith(STUDENT_ID);
    expect(m.subs.remove).not.toHaveBeenCalled(); // never deleted
  });

  it('no body: the reason is null', async () => {
    expect((await call({ method: 'POST', url })).statusCode).toBe(200);
    expect(m.cancels.cancel).toHaveBeenCalledWith(expect.objectContaining({ reason: null }));
  });

  it('409 has_payments when net paid is not 0; nothing written', async () => {
    m.subs.paid.mockResolvedValue(new Map([[SUB_ID, 50]]));
    const res = await call({ method: 'POST', url });
    expect([res.statusCode, res.json().code]).toEqual([409, 'has_payments']);
    expect(m.cancels.cancel).not.toHaveBeenCalled();
    expect(m.audit.record).not.toHaveBeenCalled();
  });

  it('409 has_lessons when a lesson not cancelled sits on a rule of its course', async () => {
    m.cancels.linkedLessons.mockResolvedValue(2);
    const res = await call({ method: 'POST', url });
    expect([res.statusCode, res.json().code]).toEqual([409, 'has_lessons']);
    expect(m.cancels.linkedLessons).toHaveBeenCalledWith(SUB_ID);
    expect(m.cancels.cancel).not.toHaveBeenCalled();
  });

  it('409 already_cancelled: as read, or lost to a racing cancel (compare-and-set)', async () => {
    m.subs.get.mockReset().mockResolvedValue(cancelled);
    expect((await call({ method: 'POST', url })).json().code).toBe('already_cancelled');
    expect(m.cancels.cancel).not.toHaveBeenCalled();
    m.subs.get.mockReset().mockResolvedValue(subRow());
    m.cancels.cancel.mockResolvedValue({ row: null, block: 'already_cancelled' });
    const res = await call({ method: 'POST', url });
    expect([res.statusCode, res.json().code]).toEqual([409, 'already_cancelled']);
    expect(m.audit.record).not.toHaveBeenCalled();
  });

  it('the DB guard (migration 934) refusing a racing payment answers its 409 code', async () => {
    m.cancels.cancel.mockResolvedValue({ row: null, block: 'has_payments' });
    expect((await call({ method: 'POST', url })).json().code).toBe('has_payments');
  });

  it('a cancelled package never changes: PATCH (pause, resume, notes) is 409 already_cancelled', async () => {
    m.subs.get.mockReset().mockResolvedValue(cancelled);
    for (const body of [{ paused: true }, { paused: false }, { notes: 'x' }]) {
      const res = await call({ method: 'PATCH', url: `/subscriptions/${SUB_ID}`, body });
      expect([res.statusCode, res.json().code]).toEqual([409, 'already_cancelled']);
    }
    expect(m.subs.update).not.toHaveBeenCalled();
  });

  it('404 subscription_not_found; 400 on an unknown field; teachers and sales are 403', async () => {
    m.subs.get.mockReset().mockResolvedValue(null);
    expect((await call({ method: 'POST', url })).json().code).toBe('subscription_not_found');
    expect((await call({ method: 'POST', url, body: { status: 'active' } })).statusCode).toBe(400);
    for (const token of ['teacher', 'salesA'] as const) expect((await call({ method: 'POST', url, token })).statusCode).toBe(403);
    expect(m.cancels.cancel).not.toHaveBeenCalled();
  });
});
