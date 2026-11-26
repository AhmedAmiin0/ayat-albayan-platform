import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb, type FakeResult } from '@/common/db/testing/fake-db';
import type { ClassroomSettings } from '@/modules/teaching/classroom';
import { FamilyPushRepo } from './family-push.repo';

const SINCE = new Date('2026-11-01T09:00:00Z');
const repoWith = (reports: FakeResult[]) =>
  new FamilyPushRepo(fakeDb({ lesson_reports: reports }).db, {} as unknown as ClassroomSettings);

describe('FamilyPushRepo error paths: the answer a failed query gives today', () => {
  it('a unique violation is 409 duplicate', async () => {
    const repo = repoWith([{ error: PG_ERRORS.unique }]);
    expect(await answerOfRejection(repo.reportsSentSince(SINCE))).toEqual({
      status: 409,
      body: { message: 'duplicate' },
    });
  });

  it('any other error is a 500 naming the code', async () => {
    const repo = repoWith([{ error: PG_ERRORS.other }]);
    expect(await answerOfRejection(repo.reportsSentSince(SINCE))).toEqual({
      status: 500,
      body: 'db error XX000: boom',
    });
  });
});
