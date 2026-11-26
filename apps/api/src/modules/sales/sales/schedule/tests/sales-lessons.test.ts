import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import { inSalesScope, isSalesLesson } from '@/modules/sales/sales/schedule/sales-lessons';
import { meetingRow, NONE, OWN_A } from '@/modules/sales/sales/sales.fakes';

describe('inSalesScope: the one rule for the meetings list and the classroom', () => {
  it('booked from one of my leads', () => {
    expect(inSalesScope(meetingRow(), OWN_A)).toBe(true);
  });

  it('a trial lesson of one of my students, even without a lead on the rule', () => {
    const row = meetingRow({ rule: { created_from_lead_id: null, package: 'trial', lead: null } });
    expect(inSalesScope(row, OWN_A)).toBe(true);
  });

  it('a paid lesson of my student (not a trial, not from a lead) is not a meeting', () => {
    const row = meetingRow({ rule: { created_from_lead_id: null, package: '8', lead: null } });
    expect(inSalesScope(row, OWN_A)).toBe(false);
  });

  it("another salesperson's lead and a lesson with no rule are out", () => {
    expect(
      inSalesScope(
        meetingRow({
          rule: { created_from_lead_id: 'l9', package: 'trial', lead: null },
          lesson_students: [],
        }),
        OWN_A,
      ),
    ).toBe(false);
    expect(inSalesScope(meetingRow({ rule: null }), OWN_A)).toBe(false);
    expect(inSalesScope(meetingRow(), NONE)).toBe(false);
  });
});

describe('sales lessons error paths: the answer a failed query gives today', () => {
  const LESSON = { profileId: 'p1', lessonId: 'l1' };

  it('a unique violation is 409 duplicate with the detail', async () => {
    const { db } = fakeDb({ lessons: [{ error: PG_ERRORS.unique }] });
    expect(await answerOfRejection(isSalesLesson(db, LESSON))).toEqual({
      status: 409,
      body: { message: 'duplicate', detail: PG_ERRORS.unique.details },
    });
  });

  it('any other error is a 500 naming the code', async () => {
    const { db } = fakeDb({ lessons: [{ error: PG_ERRORS.other }] });
    expect(await answerOfRejection(isSalesLesson(db, LESSON))).toEqual({
      status: 500,
      body: 'db error XX000: boom',
    });
  });
});
