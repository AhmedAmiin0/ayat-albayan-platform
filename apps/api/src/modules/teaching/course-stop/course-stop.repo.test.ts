import { describe, expect, it, vi } from 'vitest';
import type { Db } from '@/common/db/db.module';
import { CourseStopRepo } from './course-stop.repo';

// «إلغاء الاشتراك»'s reads and its one RPC, against a chain-recording fake client.
function chain(result: unknown) {
  const q: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const k of ['select', 'eq', 'order']) q[k] = vi.fn(() => q);
  q.maybeSingle = vi.fn(async () => result);
  return Object.assign(q, {
    then: (ok: (v: unknown) => unknown) => Promise.resolve(result).then(ok),
  });
}
const repoOf = (q: ReturnType<typeof chain>, rpc = vi.fn()) =>
  new CourseStopRepo({ from: vi.fn(() => q), rpc } as unknown as Db);
const NOW = new Date('2026-10-30T09:00:00Z');
const CALL = { subscriptionId: 's1', studentId: 'st1', requestId: 'req', actorId: 'a1', reason: 'سفر' };
const ROW = {
  cancelled_lessons: ['l1'],
  ended_rules: ['r1'],
  student_status: 'churned',
  stopped_at: '2026-10-30T09:00:00+00:00',
  replayed: false,
  status: 'cancelled',
};
const failing = (error: { code: string; message: string }) =>
  vi.fn(async () => ({ data: null, error }));

describe('CourseStopRepo', () => {
  it("subscription: 404 for an unknown package or another student's", async () => {
    const row = { id: 's1', student_id: 'st1' };
    expect(await repoOf(chain({ data: row, error: null })).subscription('s1', 'st1')).toEqual(row);
    for (const [data, student] of [[row, 'st2'], [null, 'st1']] as const)
      await expect(repoOf(chain({ data, error: null })).subscription('s1', student)).rejects.toThrow(
        'subscription_not_found',
      );
  });

  it('plan: course_stop_plan at now, parsed', async () => {
    const plan = { rule_ids: ['r1'], lessons: [{ id: 'l1', status: 'scheduled' }], unattributed: false };
    const rpc = vi.fn(async () => ({ data: plan, error: null }));
    expect(await repoOf(chain({}), rpc).plan('s1', NOW)).toEqual(plan);
    expect(rpc).toHaveBeenCalledWith('course_stop_plan', { p_subscription: 's1', p_at: NOW.toISOString() });
  });

  it('paid: payments minus refunds', async () => {
    const rows = [
      { amount: 200, kind: 'payment' },
      { amount: 50, kind: 'refund' },
    ];
    expect(await repoOf(chain({ data: rows, error: null })).paid('s1')).toBe(150);
  });

  it('stop: one stop_course call carrying the clientRequestId; its answer parsed', async () => {
    const rpc = vi.fn(async () => ({ data: ROW, error: null }));
    expect(await repoOf(chain({}), rpc).stop(CALL)).toEqual({
      cancelled_lessons: ['l1'],
      ended_rules: ['r1'],
      student_status: 'churned',
      stopped_at: ROW.stopped_at,
      replayed: false,
    });
    expect(rpc).toHaveBeenCalledWith('stop_course', {
      p: { subscription_id: 's1', student_id: 'st1', client_request_id: 'req', actor: 'a1', reason: 'سفر' },
    });
  });

  it.each([
    { message: 'subscription_not_found', code: 'P0001', expected: 'subscription_not_found', status: 404 },
    { message: 'already_cancelled', code: 'P0001', expected: 'already_cancelled', status: 409 },
    { message: 'course_unattributed', code: 'P0001', expected: 'course_unattributed', status: 409 },
    { message: 'has_future_lessons: s1', code: '23514', expected: 'has_future_lessons', status: 409 },
  ])('stop: $message → $status', async ({ message, code, expected, status }) => {
    const err = await repoOf(chain({}), failing({ code, message }))
      .stop(CALL)
      .catch((e: unknown) => e);
    expect(err).toMatchObject({ status });
    expect(JSON.stringify(err)).toContain(expected);
  });
});
