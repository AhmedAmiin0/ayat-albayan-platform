import { describe, expect, it } from 'vitest';
import { fakeDb } from '../../../people/guardians/fake-db';
import { TimeEditQueries } from './time-edit.queries';

describe('TimeEditQueries.payoutStatus (R-SCH-11)', () => {
  it('reads the payout of that teacher for the first of the month; no row → null', async () => {
    const { db, calls } = fakeDb({ teacher_payouts: [{ data: { status: 'approved' } }, { data: null }] });
    const q = new TimeEditQueries(db);
    expect(await q.payoutStatus('t1', '2026-10')).toBe('approved');
    expect(calls).toContainEqual({ table: 'teacher_payouts', method: 'eq', args: ['teacher_id', 't1'] });
    expect(calls).toContainEqual({ table: 'teacher_payouts', method: 'eq', args: ['month', '2026-10-01'] });
    expect(await q.payoutStatus('t1', '2026-11')).toBeNull();
  });

  it('a database error is not swallowed', async () => {
    const { db } = fakeDb({ teacher_payouts: [{ error: { message: 'boom' } }] });
    await expect(new TimeEditQueries(db).payoutStatus('t1', '2026-10')).rejects.toBeTruthy();
  });
});
