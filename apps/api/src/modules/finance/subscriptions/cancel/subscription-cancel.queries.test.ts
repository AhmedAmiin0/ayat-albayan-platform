import { describe, expect, it, vi } from 'vitest';
import type { Db } from '../../../../common/db/db.module';
import { SubscriptionCancelQueries } from './subscription-cancel.queries';

// The reads and the compare-and-set of «إلغاء الباقة» against a chain-recording fake client.

function chain(result: unknown) {
  const q: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const k of ['select', 'eq', 'neq', 'not', 'update']) q[k] = vi.fn(() => q);
  q.maybeSingle = vi.fn(async () => result);
  return Object.assign(q, { then: (ok: (v: unknown) => unknown) => Promise.resolve(result).then(ok) });
}

describe('SubscriptionCancelQueries', () => {
  it('linkedLessons = active course rules + lessons not cancelled on its rules', async () => {
    const rules = chain({ count: 1, error: null });
    const lessons = chain({ count: 2, error: null });
    const db = { from: vi.fn((t: string) => (t === 'schedule_rules' ? rules : lessons)) } as unknown as Db;
    expect(await new SubscriptionCancelQueries(db).linkedLessons('s1')).toBe(3);
    expect(rules.eq).toHaveBeenCalledWith('status', 'active');
    expect(lessons.eq).toHaveBeenCalledWith('rule.subscription_id', 's1');
    expect(lessons.not).toHaveBeenCalledWith('status', 'in', '(cancelled_by_teacher,cancelled_by_admin)');
  });

  it('cancel is a compare-and-set; no row → already_cancelled; the DB guard → its code', async () => {
    const write = { id: 's1', actorId: 'a1', reason: null, now: new Date('2026-10-28T09:00:00Z') };
    const run = async (result: unknown) => {
      const q = chain(result);
      const out = await new SubscriptionCancelQueries({ from: vi.fn(() => q) } as unknown as Db).cancel(write);
      return { q, out };
    };
    const ok = await run({ data: { id: 's1' }, error: null });
    expect(ok.out).toEqual({ row: { id: 's1' } });
    expect(ok.q.update).toHaveBeenCalledWith({ status: 'cancelled', cancelled_at: '2026-10-28T09:00:00.000Z', cancelled_by: 'a1', cancel_reason: null });
    expect(ok.q.neq).toHaveBeenCalledWith('status', 'cancelled');
    expect((await run({ data: null, error: null })).out).toEqual({ row: null, block: 'already_cancelled' });
    const guard = (message: string) => run({ data: null, error: { code: '23514', message } });
    expect((await guard('has_payments: subscription s1')).out).toEqual({ row: null, block: 'has_payments' });
    expect((await guard('has_lessons: subscription s1')).out).toEqual({ row: null, block: 'has_lessons' });
  });
});
