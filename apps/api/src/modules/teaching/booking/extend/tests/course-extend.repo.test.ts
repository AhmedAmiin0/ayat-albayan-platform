import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import { CourseExtendRepo } from '@/modules/teaching/booking/extend/course-extend.repo';

const DUPLICATE = { status: 409, body: { message: 'duplicate' } };
const FAILED = { status: 500, body: 'db error XX000: boom' };

describe('CourseExtendRepo error paths: the answer a failed query gives today', () => {
  it('a unique violation is 409 duplicate', async () => {
    const { db } = fakeDb({ schedule_rules: [{ error: PG_ERRORS.unique }] });
    expect(
      await answerOfRejection(new CourseExtendRepo(db).extendRules(['r1'], '2026-12-31')),
    ).toEqual(DUPLICATE);
  });

  it('any other error is a 500 naming the code', async () => {
    const { db } = fakeDb({ schedule_rules: [{ error: PG_ERRORS.other }] });
    expect(
      await answerOfRejection(new CourseExtendRepo(db).extendRules(['r1'], '2026-12-31')),
    ).toEqual(FAILED);
  });
});
