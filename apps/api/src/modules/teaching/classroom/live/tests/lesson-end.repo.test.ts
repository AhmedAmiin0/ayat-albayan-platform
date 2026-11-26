import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import type { Db } from '@/common/db/db.module';
import { readerOf } from '@/common/settings/settings.fakes';
import { ClassroomSettings } from '@/modules/teaching/classroom/classroom.settings';
import { LessonEndRepo } from '@/modules/teaching/classroom/live/lesson-end.repo';

const DUPLICATE = { status: 409, body: { message: 'duplicate' } };
const FAILED = { status: 500, body: 'db error XX000: boom' };
const repo = (db: Db) => new LessonEndRepo(db, readerOf(ClassroomSettings));

describe('LessonEndRepo error paths: the answer a failed query gives today', () => {
  it('a unique violation is 409 duplicate', async () => {
    const { db } = fakeDb({ lessons: [{ error: PG_ERRORS.unique }] });
    expect(await answerOfRejection(repo(db).stamp('l1', '2026-11-16T10:00:00.000Z'))).toEqual(
      DUPLICATE,
    );
  });

  it('any other error is a 500 naming the code', async () => {
    const { db } = fakeDb({ lessons: [{ error: PG_ERRORS.other }] });
    expect(await answerOfRejection(repo(db).stamp('l1', '2026-11-16T10:00:00.000Z'))).toEqual(
      FAILED,
    );
  });
});
