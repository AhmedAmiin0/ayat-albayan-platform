import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import { TeacherConfirmRepo } from '@/modules/teaching/lessons/teacher-me/teacher-confirm.repo';

describe('TeacherConfirmRepo error paths: the answer a failed query gives today', () => {
  it('a unique violation is 409 duplicate', async () => {
    const { db } = fakeDb({ 'rpc:teacher_confirm_lesson': [{ error: PG_ERRORS.unique }] });
    expect(
      await answerOfRejection(
        new TeacherConfirmRepo(db).confirm({ lessonId: 'l1', teacherId: 't1', actorId: 'p1' }),
      ),
    ).toEqual({
      status: 409,
      body: { message: 'duplicate' },
    });
  });

  it('any other error is a 500 naming the code', async () => {
    const { db } = fakeDb({ 'rpc:teacher_confirm_lesson': [{ error: PG_ERRORS.other }] });
    expect(
      await answerOfRejection(
        new TeacherConfirmRepo(db).confirm({ lessonId: 'l1', teacherId: 't1', actorId: 'p1' }),
      ),
    ).toEqual({
      status: 500,
      body: 'db error XX000: boom',
    });
  });
});
