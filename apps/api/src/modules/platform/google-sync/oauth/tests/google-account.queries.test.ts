import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import { GoogleAccountQueries } from '@/modules/platform/google-sync/oauth/google-account.queries';

describe('GoogleAccountQueries errors', () => {
  it('a failed read answers through the default db error map', async () => {
    const { db } = fakeDb({
      google_account: [{ error: PG_ERRORS.other }, { error: PG_ERRORS.unique }],
    });
    await expect(new GoogleAccountQueries(db).get()).rejects.toThrow('db error XX000: boom');
    expect((await answerOfRejection(new GoogleAccountQueries(db).get())).status).toBe(409);
  });
});
