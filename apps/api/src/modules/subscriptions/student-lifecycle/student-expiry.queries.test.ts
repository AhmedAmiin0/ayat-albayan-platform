import { describe, expect, it } from 'vitest';
import { fakeDb, type FakeResult } from '../../guardians/fake-db';
import { MAX_ROWS } from '../../scheduling/read-all';
import { StudentExpiryQueries } from './student-expiry.queries';

function setup(results: Record<string, FakeResult[]>) {
  const t = fakeDb(results);
  return { ...t, q: new StudentExpiryQueries(t.db) };
}
const calls = (t: ReturnType<typeof setup>, table: string) =>
  t.calls.filter((c) => c.table === table && c.method !== 'select').map((c) => [c.method, ...c.args]);

describe('StudentExpiryQueries (owner 2026-10-15)', () => {
  it('pendingRenewal: the ids of the pending_renewal students, ordered and paged', async () => {
    const t = setup({ students: [{ data: [{ id: 's1' }, { id: 's2' }] }] });
    expect(await t.q.pendingRenewal()).toEqual(['s1', 's2']);
    expect(calls(t, 'students')).toEqual([
      ['eq', 'status', 'pending_renewal'],
      ['order', 'id'],
      ['range', 0, MAX_ROWS - 1],
    ]);
  });

  it('pendingRenewal: more than max_rows students are read across pages', async () => {
    const page = (n: number, at: number) => Array.from({ length: n }, (_, i) => ({ id: `s${at + i}` }));
    const t = setup({ students: [{ data: page(MAX_ROWS, 0) }, { data: page(5, MAX_ROWS) }] });
    const ids = await t.q.pendingRenewal();
    expect(ids).toHaveLength(MAX_ROWS + 5);
    expect(ids.at(-1)).toBe(`s${MAX_ROWS + 4}`);
    expect(calls(t, 'students').filter((c) => c[0] === 'range')).toEqual([
      ['range', 0, MAX_ROWS - 1],
      ['range', MAX_ROWS, 2 * MAX_ROWS - 1],
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
    await expect(setup({ payments: [{ error: { message: 'boom' } }] }).q.paidSince('s1', 'x')).rejects.toThrow();
  });
});
