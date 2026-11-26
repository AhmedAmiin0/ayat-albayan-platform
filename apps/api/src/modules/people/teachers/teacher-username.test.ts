import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import type { FakeResult } from '@/common/db/testing/fake-db';
import { fakeDb } from '@/common/db/testing/fake-db';
import { TeacherUsernames } from './teacher-username';

const setWith = (error: FakeResult['error']) => {
  const { db } = fakeDb({ profiles: [{ error }] });
  return answerOfRejection(new TeacherUsernames(db).set('p1', 'sara'));
};

describe('TeacherUsernames error paths: the answer a failed query gives today', () => {
  it('a unique violation on the write is 409 username_taken', async () => {
    expect(await setWith(PG_ERRORS.unique)).toEqual({
      status: 409,
      body: { code: 'username_taken', message: 'username_taken' },
    });
  });

  it('a unique violation on the read is 409 duplicate with the detail', async () => {
    const { db } = fakeDb({ profiles: [{ error: PG_ERRORS.unique }] });
    expect(await answerOfRejection(new TeacherUsernames(db).of('p1'))).toEqual({
      status: 409,
      body: { message: 'duplicate', detail: PG_ERRORS.unique.details },
    });
  });

  it('any other error is a 500 naming the code', async () => {
    expect(await setWith(PG_ERRORS.other)).toEqual({
      status: 500,
      body: 'db error XX000: boom',
    });
  });
});
