import { describe, expect, it } from 'vitest';
import { LESSON_STATUSES } from '@ab/catalog';
import { canTransitionLesson } from './state-machine.js';

// Expected matrix written out by hand (not read from LESSON_TRANSITIONS), R-SCH-03 / R-SCH-07.
const ALLOWED = new Set([
  'scheduled>confirmed',
  'scheduled>completed',
  'scheduled>late',
  'scheduled>excused',
  'scheduled>no_show',
  'scheduled>cancelled_by_teacher',
  'scheduled>cancelled_by_admin',
  'scheduled>rescheduled',
  'confirmed>completed',
  'confirmed>late',
  'confirmed>excused',
  'confirmed>no_show',
  'confirmed>cancelled_by_teacher',
  'confirmed>cancelled_by_admin',
  'confirmed>rescheduled',
]);

const PAIRS = LESSON_STATUSES.flatMap((from) =>
  LESSON_STATUSES.map((to) => [from, to, ALLOWED.has(`${from}>${to}`)] as const),
);

describe('lesson status transitions (R-SCH-03, issue B2)', () => {
  it('covers every ordered pair of statuses', () => {
    expect(PAIRS).toHaveLength(81);
  });

  it.each(PAIRS)('%s → %s allowed: %s', (from, to, allowed) => {
    expect(canTransitionLesson(from, to)).toBe(allowed);
  });

  it('an outcome can be recorded without confirming first (issue B2)', () => {
    expect(canTransitionLesson('scheduled', 'completed')).toBe(true);
  });

  it.each([
    'completed',
    'late',
    'excused',
    'no_show',
    'cancelled_by_teacher',
    'cancelled_by_admin',
    'rescheduled',
  ] as const)('%s is terminal', (status) => {
    expect(LESSON_STATUSES.filter((to) => canTransitionLesson(status, to))).toEqual([]);
  });
});
