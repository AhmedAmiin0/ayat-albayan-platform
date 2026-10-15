import { describe, expect, it } from 'vitest';
import { fakeDb, type FakeResult } from '../guardians/fake-db';
import { StudentExpiryQueries } from './student-expiry.queries';

function setup(results: Record<string, FakeResult[]>) {
  const t = fakeDb(results);
  return { ...t, q: new StudentExpiryQueries(t.db) };
}
const calls = (t: ReturnType<typeof setup>, table: string) =>
  t.calls.filter((c) => c.table === table && c.method !== 'select').map((c) => [c.method, ...c.args]);

describe('StudentExpiryQueries (owner 2026-10-15)', () => {
  it('pendingRenewal: the ids of the pending_renewal students', async () => {
    const t = setup({ students: [{ data: [{ id: 's1' }, { id: 's2' }] }] });
    expect(await t.q.pendingRenewal()).toEqual(['s1', 's2']);
    expect(calls(t, 'students')).toEqual([['eq', 'status', 'pending_renewal']]);
  });

  it('packageEnd: the newest non-trial package’s renewal date, or null', async () => {
    const t = setup({ subscriptions: [{ data: { renews_on: '2026-10-01' } }, { data: null }] });
    expect(await t.q.packageEnd('s1')).toBe('2026-10-01');
    expect(await t.q.packageEnd('s1')).toBeNull();
    expect(calls(t, 'subscriptions').slice(0, 3)).toEqual([
      ['eq', 'student_id', 's1'],
      ['neq', 'status', 'trial'],
      ['order', 'created_at', { ascending: false }],
    ]);
  });

  it('paidSince: a positive payment created at or after the date', async () => {
    const t = setup({ payments: [{ count: 1 }, { count: 0 }] });
    expect(await t.q.paidSince('s1', '2026-10-01T00:00:00Z')).toBe(true);
    expect(await t.q.paidSince('s1', '2026-10-01T00:00:00Z')).toBe(false);
    expect(calls(t, 'payments').slice(0, 4)).toEqual([
      ['eq', 'subscription.student_id', 's1'],
      ['eq', 'kind', 'payment'],
      ['gt', 'amount', 0],
      ['gte', 'created_at', '2026-10-01T00:00:00Z'],
    ]);
  });

  it('a db error is thrown', async () => {
    await expect(setup({ students: [{ error: { message: 'boom' } }] }).q.pendingRenewal()).rejects.toThrow();
    await expect(setup({ subscriptions: [{ error: { message: 'boom' } }] }).q.packageEnd('s1')).rejects.toThrow();
    await expect(setup({ payments: [{ error: { message: 'boom' } }] }).q.paidSince('s1', 'x')).rejects.toThrow();
  });
});
