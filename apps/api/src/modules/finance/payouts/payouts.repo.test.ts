import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import { PayoutsRepo } from './payouts.repo';

describe('PayoutsQueries.forTeacher (a draft is the admin’s to change)', () => {
  it('asks for the teacher’s rows without drafts, newest month first', async () => {
    const { db, calls } = fakeDb({ teacher_payouts: [{ data: [] }] });
    await new PayoutsRepo(db).forTeacher('t1', '2026-09-01');
    const on = (method: string) => calls.filter((c) => c.method === method).map((c) => c.args);
    expect(on('neq')).toEqual([['status', 'draft']]);
    expect(on('eq')).toEqual([
      ['teacher_id', 't1'],
      ['month', '2026-09-01'],
    ]);
  });
});

describe('PayoutsRepo error paths: the answer a failed query gives today', () => {
  it('a unique violation is 409 duplicate', async () => {
    const { db } = fakeDb({ teachers: [{ error: PG_ERRORS.unique }] });
    expect(await answerOfRejection(new PayoutsRepo(db).teachers())).toEqual({
      status: 409,
      body: { message: 'duplicate' },
    });
  });

  it('a foreign key violation is 409 fk_violation', async () => {
    const { db } = fakeDb({ teachers: [{ error: PG_ERRORS.foreignKey }] });
    expect(await answerOfRejection(new PayoutsRepo(db).teachers())).toEqual({
      status: 409,
      body: { message: 'fk_violation' },
    });
  });

  it('any other error is a 500 naming the code', async () => {
    const { db } = fakeDb({ teachers: [{ error: PG_ERRORS.other }] });
    expect(await answerOfRejection(new PayoutsRepo(db).teachers())).toEqual({
      status: 500,
      body: 'db error XX000: boom',
    });
  });
});
