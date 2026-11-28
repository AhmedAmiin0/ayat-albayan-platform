import { describe, expect, it } from 'vitest';
import { bookingConflictsSchema, bookingResultSchema } from '../booking.schemas';

const RULE = '11111111-1111-4111-8111-111111111111';
const STUDENT = '22222222-2222-4222-8222-222222222222';
const LESSON = '33333333-3333-4333-8333-333333333333';
const RESULT = {
  rule_id: RULE,
  student_ids: [STUDENT],
  guardian_ids: [],
  lessons: [{ id: LESSON, starts_at: '2026-12-01T15:00:00Z', ends_at: '2026-12-01T15:45:00Z' }],
  message_ids: [],
  invoice_id: null,
};

describe('booking answers (R-SCH-04, R-SCH-06)', () => {
  it('reads a booked series with its lessons and queued messages', () => {
    expect(bookingResultSchema.parse(RESULT)).toEqual(RESULT);
  });

  it('refuses a result whose lesson has no end', () => {
    const lessons = [{ id: LESSON, starts_at: '2026-12-01T15:00:00Z' }];
    expect(bookingResultSchema.safeParse({ ...RESULT, lessons }).success).toBe(false);
  });

  it('refuses a result without its invoice field', () => {
    const { invoice_id: _dropped, ...rest } = RESULT;
    expect(bookingResultSchema.safeParse(rest).success).toBe(false);
  });

  it('reads the clashes of a check, an empty list when free', () => {
    expect(bookingConflictsSchema.parse({ conflicts: [] })).toEqual({ conflicts: [] });
    const clash = { kind: 'later', startsAt: RESULT.lessons[0]?.starts_at, endsAt: 'x' };
    expect(bookingConflictsSchema.safeParse({ conflicts: [clash] }).success).toBe(false);
  });
});
