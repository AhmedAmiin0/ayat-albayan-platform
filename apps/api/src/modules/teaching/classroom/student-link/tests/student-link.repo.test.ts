import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import type { Db } from '@/common/db/db.module';
import { readerOf } from '@/common/settings/settings.fakes';
import { ClassroomSettings } from '@/modules/teaching/classroom/classroom.settings';
import { StudentLinkRepo } from '@/modules/teaching/classroom/student-link/student-link.repo';

const DUPLICATE = { status: 409, body: { message: 'duplicate' } };
const FAILED = { status: 500, body: 'db error XX000: boom' };
const repo = (db: Db) => new StudentLinkRepo(db, readerOf(ClassroomSettings));

describe('StudentLinkRepo error paths: the answer a failed query gives today', () => {
  it('a unique violation is 409 duplicate with the detail', async () => {
    const { db } = fakeDb({ students: [{ error: PG_ERRORS.unique }] });
    expect(await answerOfRejection(repo(db).student('s1'))).toEqual(DUPLICATE);
  });

  it('any other error is a 500 naming the code', async () => {
    const { db } = fakeDb({ students: [{ error: PG_ERRORS.other }] });
    expect(await answerOfRejection(repo(db).student('s1'))).toEqual(FAILED);
  });
});
