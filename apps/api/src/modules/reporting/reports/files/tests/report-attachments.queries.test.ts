import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import { ReportAttachmentsQueries } from '@/modules/reporting/reports/files/report-attachments.queries';

describe('ReportAttachmentsQueries error paths: the answer a failed query gives today', () => {
  it('a unique violation is 409 duplicate with the detail', async () => {
    const { db } = fakeDb({ report_attachments: [{ error: PG_ERRORS.unique }] });
    expect(await answerOfRejection(new ReportAttachmentsQueries(db).get('r1', 'a1'))).toEqual({
      status: 409,
      body: { message: 'duplicate', detail: PG_ERRORS.unique.details },
    });
  });

  it('any other error is a 500 naming the code', async () => {
    const { db } = fakeDb({ report_attachments: [{ error: PG_ERRORS.other }] });
    expect(await answerOfRejection(new ReportAttachmentsQueries(db).get('r1', 'a1'))).toEqual({
      status: 500,
      body: 'db error XX000: boom',
    });
  });
});
