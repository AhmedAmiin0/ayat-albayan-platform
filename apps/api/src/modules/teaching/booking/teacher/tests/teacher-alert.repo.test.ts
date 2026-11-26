import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import type { Db } from '@/common/db/db.module';
import { readerOf } from '@/common/settings/settings.fakes';
import { BookingSettings } from '@/modules/teaching/booking/booking.settings';
import { TeacherAlertRepo } from '@/modules/teaching/booking/teacher/teacher-alert.repo';

const DUPLICATE = { status: 409, body: { message: 'duplicate' } };
const FAILED = { status: 500, body: 'db error XX000: boom' };
const repo = (db: Db) => new TeacherAlertRepo(db, readerOf(BookingSettings));

describe('TeacherAlertRepo error paths: the answer a failed query gives today', () => {
  it('a unique violation is 409 duplicate with the detail', async () => {
    const { db } = fakeDb({ lessons: [{ error: PG_ERRORS.unique }] });
    expect(await answerOfRejection(repo(db).lessons(['l1']))).toEqual(DUPLICATE);
  });

  it('any other error is a 500 naming the code', async () => {
    const { db } = fakeDb({ lessons: [{ error: PG_ERRORS.other }] });
    expect(await answerOfRejection(repo(db).lessons(['l1']))).toEqual(FAILED);
  });
});
