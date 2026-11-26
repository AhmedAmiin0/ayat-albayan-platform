import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import { ReportLessonQueries } from '@/modules/reporting/reports/shared/report-lesson.queries';

describe('ReportLessonQueries error paths: the answer a failed query gives today', () => {
  it('a unique violation is 409 duplicate', async () => {
    const { db } = fakeDb({ v_subscription_balance: [{ error: PG_ERRORS.unique }] });
    expect(await answerOfRejection(new ReportLessonQueries(db).packages(['s1']))).toEqual({
      status: 409,
      body: { message: 'duplicate' },
    });
  });

  it('any other error is a 500 naming the code', async () => {
    const { db } = fakeDb({ v_subscription_balance: [{ error: PG_ERRORS.other }] });
    expect(await answerOfRejection(new ReportLessonQueries(db).packages(['s1']))).toEqual({
      status: 500,
      body: 'db error XX000: boom',
    });
  });
});
