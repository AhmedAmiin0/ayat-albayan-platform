import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import { AssistantLessonsRepo } from './assistants.lessons';

const DUPLICATE = { status: 409, body: { message: 'duplicate' } };
const FAILED = { status: 500, body: 'db error XX000: boom' };
const REFS = [{ lesson_id: 'l1', student_id: 's1' }];
const RANGE = { from: '2026-11-01T00:00:00Z', to: '2026-11-08T00:00:00Z' };

describe('AssistantLessonsRepo error paths: the answer a failed query gives today', () => {
  it('a unique violation is 409 duplicate', async () => {
    const { db } = fakeDb({ lessons: [{ error: PG_ERRORS.unique }] });
    expect(await answerOfRejection(new AssistantLessonsRepo(db).between(REFS, RANGE))).toEqual(
      DUPLICATE,
    );
  });

  it('any other error is a 500 naming the code', async () => {
    const { db } = fakeDb({ lessons: [{ error: PG_ERRORS.other }] });
    expect(await answerOfRejection(new AssistantLessonsRepo(db).between(REFS, RANGE))).toEqual(
      FAILED,
    );
  });
});
