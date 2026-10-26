import { describe, expect, it } from 'vitest';
import { fakeDb } from '../../people/guardians/fake-db';
import { PayoutsQueries } from './payouts.queries';

describe('PayoutsQueries.forTeacher (a draft is the admin’s to change)', () => {
  it('asks for the teacher’s rows without drafts, newest month first', async () => {
    const { db, calls } = fakeDb({ teacher_payouts: [{ data: [] }] });
    await new PayoutsQueries(db).forTeacher('t1', '2026-09-01');
    const on = (method: string) => calls.filter((c) => c.method === method).map((c) => c.args);
    expect(on('neq')).toEqual([['status', 'draft']]);
    expect(on('eq')).toEqual([['teacher_id', 't1'], ['month', '2026-09-01']]);
  });
});
