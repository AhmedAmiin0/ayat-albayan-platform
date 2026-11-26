import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import { ShortLinksRepo } from './short-links.repo';

const ROW = { code: 'c1', kind: 'k', subject: 's', target_url: '/x', expires_at: null };

describe('ShortLinksRepo error paths: the answer a failed query gives today', () => {
  it('a unique violation is 409 duplicate with the detail', async () => {
    const { db } = fakeDb({ short_links: [{ error: PG_ERRORS.unique }] });
    expect(await answerOfRejection(new ShortLinksRepo(db).byCode('c1'))).toEqual({
      status: 409,
      body: { message: 'duplicate' },
    });
  });

  it('any other error is a 500 naming the code', async () => {
    const { db } = fakeDb({ short_links: [{ error: PG_ERRORS.other }] });
    expect(await answerOfRejection(new ShortLinksRepo(db).byCode('c1'))).toEqual({
      status: 500,
      body: 'db error XX000: boom',
    });
  });

  it('a unique violation on insert is no error: null, the caller picks another code', async () => {
    const { db } = fakeDb({ short_links: [{ error: PG_ERRORS.unique }] });
    expect(await new ShortLinksRepo(db).insert(ROW)).toBeNull();
  });
});
