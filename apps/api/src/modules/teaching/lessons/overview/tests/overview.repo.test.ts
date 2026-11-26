import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import { readerOf } from '@/common/settings/settings.fakes';
import { fakePhotos } from '@/common/storage/avatars/avatars.fakes';
import { LessonsSettings } from '@/modules/teaching/lessons/lessons.settings';
import { OverviewRepo } from '@/modules/teaching/lessons/overview/overview.repo';

const WINDOW = { from: new Date('2026-10-03T21:00:00Z'), to: new Date('2026-10-10T21:00:00Z') };
const failing = (error: (typeof PG_ERRORS)[keyof typeof PG_ERRORS]) => {
  const { db } = fakeDb({ teachers: [{ error }] });
  const settings = readerOf(LessonsSettings, { teachers_always_available: false });
  return new OverviewRepo(db, settings, fakePhotos().photos).teachers(WINDOW);
};

describe('OverviewRepo error paths: the answer a failed query gives today', () => {
  it('a unique violation is 409 duplicate with the detail', async () => {
    expect(await answerOfRejection(failing(PG_ERRORS.unique))).toEqual({
      status: 409,
      body: { message: 'duplicate' },
    });
  });

  it('any other error is a 500 naming the code', async () => {
    expect(await answerOfRejection(failing(PG_ERRORS.other))).toEqual({
      status: 500,
      body: 'db error XX000: boom',
    });
  });
});
