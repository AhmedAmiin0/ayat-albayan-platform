import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import type { FakeResult } from '@/common/db/testing/fake-db';
import { fakeDb } from '@/common/db/testing/fake-db';
import { StudentRecordsRepo } from './student-records.repo';

const removeWith = (error: FakeResult['error']) => {
  const { db } = fakeDb({ students: [{ error }] });
  return answerOfRejection(new StudentRecordsRepo(db).removeEmpty('s1'));
};

describe('StudentRecordsRepo error paths: the answer a failed query gives today', () => {
  it('a foreign key violation on the delete is 409 student_has_records', async () => {
    expect(await removeWith(PG_ERRORS.foreignKey)).toEqual({
      status: 409,
      body: { code: 'student_has_records', message: 'student_has_records' },
    });
  });

  it('a unique violation is 409 duplicate with the detail', async () => {
    expect(await removeWith(PG_ERRORS.unique)).toEqual({
      status: 409,
      body: { message: 'duplicate', detail: PG_ERRORS.unique.details },
    });
  });

  it('any other error is a 500 naming the code', async () => {
    expect(await removeWith(PG_ERRORS.other)).toEqual({
      status: 500,
      body: 'db error XX000: boom',
    });
  });
});
