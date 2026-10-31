import { describe, expect, it } from 'vitest';
import { LESSON_STATUSES } from '../../enums/index.js';
import { isCancelledLesson, isClosedLesson } from './state-machine.js';

// Written out by hand: the sets the api mappers, the calendar writer and mobile used to copy.
const CANCELLED = new Set(['cancelled_by_teacher', 'cancelled_by_admin']);
const CLOSED = new Set(['cancelled_by_teacher', 'cancelled_by_admin', 'rescheduled']);

describe('lesson status sets', () => {
  it.each(LESSON_STATUSES)('%s is cancelled only when the teacher or admin cancelled it', (s) => {
    expect(isCancelledLesson(s)).toBe(CANCELLED.has(s));
  });

  it.each(LESSON_STATUSES)('%s is closed only when cancelled or rescheduled', (s) => {
    expect(isClosedLesson(s)).toBe(CLOSED.has(s));
  });

  it('a student excuse is neither cancelled nor closed', () => {
    expect(isCancelledLesson('excused')).toBe(false);
    expect(isClosedLesson('excused')).toBe(false);
  });

  it('an unknown status string is neither', () => {
    expect(isCancelledLesson('cancelled')).toBe(false);
    expect(isClosedLesson('')).toBe(false);
  });
});
