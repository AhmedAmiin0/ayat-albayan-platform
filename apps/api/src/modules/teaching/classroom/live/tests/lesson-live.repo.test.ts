import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import { LessonLiveRepo } from '@/modules/teaching/classroom/live/lesson-live.repo';

const DUPLICATE = { status: 409, body: { message: 'duplicate' } };
const FAILED = { status: 500, body: 'db error XX000: boom' };

describe('LessonLiveRepo error paths: the answer a failed query gives today', () => {
  it('a unique violation is 409 duplicate with the detail', async () => {
    const { db } = fakeDb({ lessons: [{ error: PG_ERRORS.unique }] });
    expect(await answerOfRejection(new LessonLiveRepo(db).lesson('l1'))).toEqual(DUPLICATE);
  });

  it('any other error is a 500 naming the code', async () => {
    const { db } = fakeDb({ lessons: [{ error: PG_ERRORS.other }] });
    expect(await answerOfRejection(new LessonLiveRepo(db).lesson('l1'))).toEqual(FAILED);
  });
});
