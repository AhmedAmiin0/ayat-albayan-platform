import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import { TrialDateRepo } from '@/modules/teaching/booking/trial-date/trial-date.repo';

const DUPLICATE = { status: 409, body: { message: 'duplicate', detail: PG_ERRORS.unique.details } };
const FAILED = { status: 500, body: 'db error XX000: boom' };

describe('TrialDateRepo error paths: the answer a failed query gives today', () => {
  it('a unique violation is 409 duplicate with the detail', async () => {
    const { db } = fakeDb({ students: [{ error: PG_ERRORS.unique }] });
    expect(await answerOfRejection(new TrialDateRepo(db).student('s1'))).toEqual(DUPLICATE);
  });

  it('any other error is a 500 naming the code', async () => {
    const { db } = fakeDb({ students: [{ error: PG_ERRORS.other }] });
    expect(await answerOfRejection(new TrialDateRepo(db).student('s1'))).toEqual(FAILED);
  });
});
