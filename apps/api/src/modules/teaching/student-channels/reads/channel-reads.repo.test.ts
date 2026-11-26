import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import { ChannelReadsRepo } from './channel-reads.repo';

describe('ChannelReadsRepo error paths: the answer a failed query gives today', () => {
  it('a unique violation is 409 duplicate', async () => {
    const { db } = fakeDb({ channel_reads: [{ error: PG_ERRORS.unique }] });
    expect(await answerOfRejection(new ChannelReadsRepo(db).marks('c1'))).toEqual({
      status: 409,
      body: { message: 'duplicate' },
    });
  });

  it('any other error is a 500 naming the code', async () => {
    const { db } = fakeDb({ channel_reads: [{ error: PG_ERRORS.other }] });
    expect(await answerOfRejection(new ChannelReadsRepo(db).marks('c1'))).toEqual({
      status: 500,
      body: 'db error XX000: boom',
    });
  });
});
