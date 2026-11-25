import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import type { Db } from '@/common/db/db.module';
import { readerOf } from '@/common/settings/settings.fakes';
import { ClassroomSettings } from '@/modules/teaching/classroom/classroom.settings';
import {
  InternalMeetingsRepo,
  type NewMeeting,
} from '@/modules/teaching/classroom/internal-meetings/internal-meetings.repo';

const DUPLICATE = { status: 409, body: { message: 'duplicate', detail: PG_ERRORS.unique.details } };
const FAILED = { status: 500, body: 'db error XX000: boom' };
const ROW: NewMeeting = {
  title: 't',
  createdBy: 'p1',
  hash: 'h',
  startsAt: null,
  plannedEndAt: null,
  clientRequestId: null,
};
const repo = (db: Db) => new InternalMeetingsRepo(db, readerOf(ClassroomSettings));

describe('InternalMeetingsRepo error paths: the answer a failed query gives today', () => {
  it('a unique violation without a request id is 409 duplicate with the detail', async () => {
    const { db } = fakeDb({ meetings: [{ error: PG_ERRORS.unique }] });
    expect(await answerOfRejection(repo(db).insert(ROW))).toEqual(DUPLICATE);
  });

  it('a unique violation of a retried request id answers null (the caller reads it back)', async () => {
    const { db } = fakeDb({ meetings: [{ error: PG_ERRORS.unique }] });
    await expect(repo(db).insert({ ...ROW, clientRequestId: 'r1' })).resolves.toBeNull();
  });

  it('any other error is a 500 naming the code', async () => {
    const { db } = fakeDb({ meetings: [{ error: PG_ERRORS.other }] });
    expect(await answerOfRejection(repo(db).insert(ROW))).toEqual(FAILED);
  });
});
