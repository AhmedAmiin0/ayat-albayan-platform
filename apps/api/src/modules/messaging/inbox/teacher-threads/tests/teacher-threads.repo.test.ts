import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb, type FakeResult } from '@/common/db/testing/fake-db';
import { TeacherThreadsRepo } from '@/modules/messaging/inbox/teacher-threads/teacher-threads.repo';
import type { TeacherMeRepo } from '@/modules/teaching/lessons/teacher-me/teacher-me.repo';

const repoWith = (teachers: FakeResult[]) =>
  new TeacherThreadsRepo(fakeDb({ teachers }).db, {} as unknown as TeacherMeRepo);

describe('TeacherThreadsRepo error paths: the answer a failed query gives today', () => {
  it('a unique violation is 409 duplicate with the detail', async () => {
    const repo = repoWith([{ error: PG_ERRORS.unique }]);
    expect(await answerOfRejection(repo.teacher('p1'))).toEqual({
      status: 409,
      body: { message: 'duplicate' },
    });
  });

  it('any other error is a 500 naming the code', async () => {
    const repo = repoWith([{ error: PG_ERRORS.other }]);
    expect(await answerOfRejection(repo.teacher('p1'))).toEqual({
      status: 500,
      body: 'db error XX000: boom',
    });
  });
});
