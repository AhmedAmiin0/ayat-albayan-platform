import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import { MeetingListRepo } from '@/modules/teaching/classroom/meetings/schedule/meeting-list.repo';

const DUPLICATE = { status: 409, body: { message: 'duplicate' } };
const FAILED = { status: 500, body: 'db error XX000: boom' };

describe('MeetingListRepo error paths: the answer a failed query gives today', () => {
  it('a unique violation is 409 duplicate with the detail', async () => {
    const { db } = fakeDb({ meetings: [{ error: PG_ERRORS.unique }] });
    expect(await answerOfRejection(new MeetingListRepo(db).latest(null))).toEqual(DUPLICATE);
  });

  it('any other error is a 500 naming the code', async () => {
    const { db } = fakeDb({ meetings: [{ error: PG_ERRORS.other }] });
    expect(await answerOfRejection(new MeetingListRepo(db).latest(null))).toEqual(FAILED);
  });
});
