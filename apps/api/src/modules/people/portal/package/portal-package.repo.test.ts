import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import { PortalPackageRepo } from './portal-package.repo';

describe('PortalPackageRepo error paths: the answer a failed query gives today', () => {
  it('a unique violation is 409 duplicate with the detail', async () => {
    const { db } = fakeDb({ payments: [{ error: PG_ERRORS.unique }] });
    expect(await answerOfRejection(new PortalPackageRepo(db).payments('s1'))).toEqual({
      status: 409,
      body: { message: 'duplicate' },
    });
  });

  it('any other error is a 500 naming the code', async () => {
    const { db } = fakeDb({ payments: [{ error: PG_ERRORS.other }] });
    expect(await answerOfRejection(new PortalPackageRepo(db).payments('s1'))).toEqual({
      status: 500,
      body: 'db error XX000: boom',
    });
  });
});
