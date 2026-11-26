import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import type { Db } from '@/common/db/db.module';
import { fakeDb } from '@/common/db/testing/fake-db';
import { readerOf } from '@/common/settings/settings.fakes';
import { TeachersSettings } from '@/modules/people/teachers/teachers.settings';
import { AvailabilityRepo } from './availability.repo';

const repoOf = (db: Db) => new AvailabilityRepo(db, readerOf(TeachersSettings));

describe('AvailabilityRepo error paths: the answer a failed query gives today', () => {
  it('a unique violation is 409 duplicate with the detail', async () => {
    const { db } = fakeDb({ teacher_availability: [{ error: PG_ERRORS.unique }] });
    expect(await answerOfRejection(repoOf(db).listSlots('t1'))).toEqual({
      status: 409,
      body: { message: 'duplicate' },
    });
  });

  it('any other error is a 500 naming the code', async () => {
    const { db } = fakeDb({ teacher_availability: [{ error: PG_ERRORS.other }] });
    expect(await answerOfRejection(repoOf(db).listSlots('t1'))).toEqual({
      status: 500,
      body: 'db error XX000: boom',
    });
  });
});
