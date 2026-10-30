import { describe, expect, it, vi } from 'vitest';
import type { Db } from '@/common/db/db.module';
import { CourseStopRepo } from './course-stop.repo';

// «إلغاء الاشتراك»'s reads and the compare-and-set, against a chain-recording fake client.
function chain(result: unknown) {
  const q: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const k of ['select', 'eq', 'neq', 'in', 'or', 'gte', 'order', 'update'])
    q[k] = vi.fn(() => q);
  q.maybeSingle = vi.fn(async () => result);
  return Object.assign(q, {
    then: (ok: (v: unknown) => unknown) => Promise.resolve(result).then(ok),
  });
}
const repoOf = (q: ReturnType<typeof chain>) =>
  new CourseStopRepo({ from: vi.fn(() => q) } as unknown as Db);
const NOW = new Date('2026-10-30T09:00:00Z');

describe('CourseStopRepo', () => {
  it("subscription: 404 for an unknown package or another student's", async () => {
    const row = { id: 's1', student_id: 'st1' };
    expect(await repoOf(chain({ data: row, error: null })).subscription('s1', 'st1')).toEqual(row);
    await expect(
      repoOf(chain({ data: row, error: null })).subscription('s1', 'st2'),
    ).rejects.toThrow('subscription_not_found');
    await expect(
      repoOf(chain({ data: null, error: null })).subscription('s1', 'st1'),
    ).rejects.toThrow('subscription_not_found');
  });

  it("activeRules: the course's active rules still reaching the day", async () => {
    const q = chain({ data: [{ id: 'r1', ends_on: null }], error: null });
    expect(await repoOf(q).activeRules('s1', '2026-10-29')).toEqual([{ id: 'r1', ends_on: null }]);
    expect(q.eq).toHaveBeenCalledWith('subscription_id', 's1');
    expect(q.eq).toHaveBeenCalledWith('status', 'active');
    expect(q.or).toHaveBeenCalledWith('ends_on.is.null,ends_on.gte.2026-10-29');
  });

  it('futureLessons: open lessons of the course from now', async () => {
    const q = chain({ data: [{ id: 'l1' }], error: null });
    expect(await repoOf(q).futureLessons('s1', NOW)).toEqual(['l1']);
    expect(q.in).toHaveBeenCalledWith('status', ['scheduled', 'confirmed']);
    expect(q.gte).toHaveBeenCalledWith('starts_at', NOW.toISOString());
  });

  it('paid: payments minus refunds', async () => {
    const q = chain({
      data: [
        { amount: 200, kind: 'payment' },
        { amount: 50, kind: 'refund' },
      ],
      error: null,
    });
    expect(await repoOf(q).paid('s1')).toBe(150);
  });

  it('stamp: a compare-and-set to cancelled / stopped with who, when and why', async () => {
    const q = chain({ data: { id: 's1' }, error: null });
    expect(await repoOf(q).stamp({ id: 's1', actorId: 'a1', reason: 'سفر', now: NOW })).toEqual({
      id: 's1',
    });
    expect(q.update).toHaveBeenCalledWith({
      status: 'cancelled',
      cancel_kind: 'stopped',
      cancelled_at: NOW.toISOString(),
      cancelled_by: 'a1',
      cancel_reason: 'سفر',
    });
    expect(q.neq).toHaveBeenCalledWith('status', 'cancelled');
    expect(
      await repoOf(chain({ data: null, error: null })).stamp({
        id: 's1',
        actorId: 'a1',
        reason: 'x',
        now: NOW,
      }),
    ).toBeNull();
    const guard = chain({
      data: null,
      error: { code: '23514', message: 'has_future_lessons: subscription s1' },
    });
    await expect(
      repoOf(guard).stamp({ id: 's1', actorId: 'a1', reason: 'x', now: NOW }),
    ).rejects.toThrow('has_future_lessons');
  });

  it('replay: the audit row of this clientRequestId, or null', async () => {
    const q = chain({ data: { after: { cancelled_lessons: ['l1'] } }, error: null });
    expect(await repoOf(q).replay('s1', 'req')).toEqual({ cancelled_lessons: ['l1'] });
    expect(q.eq).toHaveBeenCalledWith('after->>client_request_id', 'req');
    expect(q.eq).toHaveBeenCalledWith('action', 'cancel');
    expect(await repoOf(chain({ data: null, error: null })).replay('s1', 'req')).toBeNull();
  });
});
