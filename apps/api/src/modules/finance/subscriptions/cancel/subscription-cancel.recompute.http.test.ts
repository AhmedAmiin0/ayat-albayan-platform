import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { STUDENT_ID, subRow } from '../money/money.fakes';
import { moneyApp, resetMocks, type Mocks } from '../test-app';

// A cancelled package (owner 2026-10-28) is never current, never counted, never recomputed back to life.

const OLD = '5b000000-0000-4000-8000-0000000000aa';
const CANCELLED = '5b000000-0000-4000-8000-0000000000cc';
const rows = () => [
  subRow({ id: OLD, status: 'active', created_at: '2026-10-01T09:00:00Z' }),
  subRow({ id: CANCELLED, status: 'cancelled', lessons_total: 8, created_at: '2026-10-28T09:00:00Z' }),
];

describe('a cancelled package in the student balance and the recompute', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    m.subs.forStudent.mockResolvedValue(rows());
    m.subs.paid.mockResolvedValue(new Map([[OLD, 145]]));
    m.balances.forSubscriptions.mockResolvedValue(new Map([[OLD, { subscription_id: OLD, lessons_total: 4, lessons_used: 1, remaining: 3, is_last: true, ended_at: null, projected_end_at: null }]]));
  });

  it('GET balance: current is the newest live package; the cancelled one is listed with nothing left', async () => {
    const res = await call({ method: 'GET', url: `/students/${STUDENT_ID}/balance` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ remaining: 3, current: { id: OLD } });
    expect(res.json().packages).toEqual([
      expect.objectContaining({ id: OLD }),
      expect.objectContaining({ id: CANCELLED, status: 'cancelled', balance: expect.objectContaining({ remaining: 0 }) }),
    ]);
  });

  it('the recompute after a money write never touches the cancelled package and raises nothing on it', async () => {
    m.subs.get.mockResolvedValue(rows()[0]);
    m.subs.update.mockResolvedValue(rows()[0]);
    m.balances.forSubscriptions.mockResolvedValue(new Map([[OLD, { subscription_id: OLD, lessons_total: 4, lessons_used: 4, remaining: 0, is_last: true, ended_at: null, projected_end_at: null }]]));
    m.alerts.raiseTask.mockResolvedValue(false);
    await call({ method: 'PATCH', url: `/subscriptions/${OLD}`, body: { notes: 'x' } });
    for (const [id] of m.subs.update.mock.calls) expect(id).not.toBe(CANCELLED);
    for (const [task] of m.alerts.raiseTask.mock.calls) expect(task).toMatchObject({ subjectId: OLD });
    expect(m.alerts.raiseTask).toHaveBeenCalled();
    expect(m.alerts.closeTasks).toHaveBeenCalledWith(expect.objectContaining({ subjectIds: [OLD] }));
  });
});
