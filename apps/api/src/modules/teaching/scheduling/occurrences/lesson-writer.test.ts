import type { Conflict } from '@ab/schedule';
import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import type { Db } from '@/common/db/db.module';
import { fakePolicy } from '@/modules/messaging/notification-rules/policy/policy.fakes';
import { LessonWriter } from './lesson-writer';

const DUPLICATE = { status: 409, body: { message: 'duplicate' } };
const FAILED = { status: 500, body: 'db error XX000: boom' };
const AT = '2026-11-01T14:00:00.000Z';
const END = '2026-11-01T14:45:00.000Z';
const LESSONS = [{ id: 'l1', starts_at: AT, ends_at: END }];
const CONFLICTS: Conflict[] = [{ kind: 'teacher_busy', startsAt: AT, endsAt: END }];
const flag = (db: Db) => new LessonWriter(db, fakePolicy()).flagConflicts(LESSONS, CONFLICTS);

describe('LessonWriter error paths: the answer a failed query gives today', () => {
  it('a unique violation is 409 duplicate', async () => {
    const { db } = fakeDb({ lessons: [{ error: PG_ERRORS.unique }] });
    expect(await answerOfRejection(flag(db))).toEqual(DUPLICATE);
  });

  it('any other error is a 500 naming the code', async () => {
    const { db } = fakeDb({ lessons: [{ error: PG_ERRORS.other }] });
    expect(await answerOfRejection(flag(db))).toEqual(FAILED);
  });
});
