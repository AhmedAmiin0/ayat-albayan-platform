import { describe, expect, it } from 'vitest';
import { payoutBreakdownSchema } from './payout-breakdown.schemas';

const valid = {
  lines: [{ duration: 45, lessons: 2, rate: 70, amount: 140 }],
  lesson_ids: ['l1', 'l2'],
  statuses: ['completed'],
};

describe('payoutBreakdownSchema (teacher_payouts.breakdown, R-PAY-02)', () => {
  it('reads a row written by generate as it is', () => {
    expect(payoutBreakdownSchema.parse(valid)).toEqual(valid);
  });

  it('reads the column default {} as an empty breakdown', () => {
    expect(payoutBreakdownSchema.parse({})).toEqual({ lines: [], lesson_ids: [], statuses: [] });
  });

  it('drops the legacy skipped_lesson_ids key', () => {
    expect(payoutBreakdownSchema.parse({ ...valid, skipped_lesson_ids: [] })).toEqual(valid);
  });

  it.each([
    ['not an object', []],
    ['null', null],
    ['lesson ids not strings', { ...valid, lesson_ids: [1, 2] }],
    ['an empty lesson id', { ...valid, lesson_ids: [''] }],
    ['lesson ids not a list', { ...valid, lesson_ids: 'l1' }],
    ['an unknown status', { ...valid, statuses: ['done'] }],
    ['a line without an amount', { ...valid, lines: [{ duration: 45, lessons: 2, rate: 70 }] }],
    [
      'a negative lesson count',
      { ...valid, lines: [{ duration: 45, lessons: -1, rate: 70, amount: 0 }] },
    ],
  ])('refuses %s', (_label, value) => {
    expect(payoutBreakdownSchema.safeParse(value).success).toBe(false);
  });

  it('keeps a missing rate as null', () => {
    const line = { duration: 50, lessons: 1, rate: null, amount: 0 };
    expect(payoutBreakdownSchema.parse({ ...valid, lines: [line] }).lines).toEqual([line]);
  });
});
