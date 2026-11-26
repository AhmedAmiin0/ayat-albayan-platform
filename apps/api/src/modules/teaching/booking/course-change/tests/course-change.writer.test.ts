import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import type { Db } from '@/common/db/db.module';
import { LessonEvents } from '@/common/infra/events/lesson-events';
import { fakePolicy } from '@/modules/messaging/notification-rules/policy/policy.fakes';
import { CourseChangeWriter } from '@/modules/teaching/booking/course-change/course-change.writer';
import type { CourseChangeNotices } from '@/modules/teaching/booking/course-change/notices/course-change.notices';

const DUPLICATE = { status: 409, body: { message: 'duplicate', detail: PG_ERRORS.unique.details } };
const FAILED = { status: 500, body: 'db error XX000: boom' };
// replay reads only the db: the notices are never reached.
const notices = {} as unknown as CourseChangeNotices;
const replay = (db: Db) =>
  new CourseChangeWriter(db, new LessonEvents(), fakePolicy(), notices).replay('req1', 'sub1');

describe('CourseChangeWriter error paths: the answer a failed query gives today', () => {
  it('a unique violation is 409 duplicate with the detail', async () => {
    const { db } = fakeDb({ schedule_rules: [{ error: PG_ERRORS.unique }] });
    expect(await answerOfRejection(replay(db))).toEqual(DUPLICATE);
  });

  it('any other error is a 500 naming the code', async () => {
    const { db } = fakeDb({ schedule_rules: [{ error: PG_ERRORS.other }] });
    expect(await answerOfRejection(replay(db))).toEqual(FAILED);
  });
});
