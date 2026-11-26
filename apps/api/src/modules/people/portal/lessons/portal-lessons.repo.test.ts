import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import type { Db } from '@/common/db/db.module';
import { fakeDb } from '@/common/db/testing/fake-db';
import { readerOf } from '@/common/settings/settings.fakes';
import { PortalSettings } from '@/modules/people/portal/portal.settings';
import { PortalLessonsRepo } from './portal-lessons.repo';

const repoOf = (db: Db) => new PortalLessonsRepo(db, readerOf(PortalSettings));

describe('PortalLessonsRepo error paths: the answer a failed query gives today', () => {
  it('a unique violation is 409 duplicate', async () => {
    const { db } = fakeDb({ students: [{ error: PG_ERRORS.unique }] });
    expect(await answerOfRejection(repoOf(db).override('s1'))).toEqual({
      status: 409,
      body: { message: 'duplicate' },
    });
  });

  it('any other error is a 500 naming the code', async () => {
    const { db } = fakeDb({ students: [{ error: PG_ERRORS.other }] });
    expect(await answerOfRejection(repoOf(db).override('s1'))).toEqual({
      status: 500,
      body: 'db error XX000: boom',
    });
  });
});
