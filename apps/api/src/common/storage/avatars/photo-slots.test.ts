import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import { profileSlot, teacherSlot } from './photo-slots';

describe('photo slots error paths: the answer a failed query gives today', () => {
  it('a unique violation on the profile read is 409 duplicate with the detail', async () => {
    const { db } = fakeDb({ profiles: [{ error: PG_ERRORS.unique }] });
    expect(await answerOfRejection(profileSlot(db, 'p1').read())).toEqual({
      status: 409,
      body: { message: 'duplicate' },
    });
  });

  it('any other error on the teacher read is a 500 naming the code', async () => {
    const { db } = fakeDb({ teachers: [{ error: PG_ERRORS.other }] });
    expect(await answerOfRejection(teacherSlot(db, 't1').read())).toEqual({
      status: 500,
      body: 'db error XX000: boom',
    });
  });
});
