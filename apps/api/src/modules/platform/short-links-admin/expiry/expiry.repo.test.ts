import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import { LinkExpiryRepo } from './expiry.repo';

describe('LinkExpiryRepo error paths: the answer a failed query gives today', () => {
  it('a unique violation is 409 duplicate', async () => {
    const { db } = fakeDb({ short_links: [{ error: PG_ERRORS.unique }] });
    expect(
      await answerOfRejection(new LinkExpiryRepo(db).expire(new Date('2026-11-01T00:00:00Z'))),
    ).toEqual({
      status: 409,
      body: { message: 'duplicate' },
    });
  });

  it('any other error is a 500 naming the code', async () => {
    const { db } = fakeDb({ short_links: [{ error: PG_ERRORS.other }] });
    expect(
      await answerOfRejection(new LinkExpiryRepo(db).expire(new Date('2026-11-01T00:00:00Z'))),
    ).toEqual({
      status: 500,
      body: 'db error XX000: boom',
    });
  });
});
