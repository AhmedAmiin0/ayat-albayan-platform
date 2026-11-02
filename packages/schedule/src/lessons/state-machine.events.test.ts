import { describe, expect, it } from 'vitest';
import {
  allowedLessonEvents,
  applyLessonEvent,
  CANCEL_STATUS,
  isOpenLesson,
  OCCUPYING_LESSON_STATUSES,
  STATUS_ROUTE_EVENTS,
} from './state-machine.js';

describe('lesson events (R-SCH-03, R-SCH-07, R-SCH-08)', () => {
  it('a scheduled lesson offers every action', () => {
    expect(allowedLessonEvents('scheduled')).toEqual([
      'confirm',
      'complete',
      'mark_late',
      'excuse',
      'mark_no_show',
      'cancel_by_teacher',
      'cancel_by_admin',
      'reschedule',
    ]);
  });

  it('a confirmed lesson offers everything but confirm', () => {
    expect(allowedLessonEvents('confirmed')).not.toContain('confirm');
    expect(allowedLessonEvents('confirmed')).toHaveLength(7);
  });

  it.each(['completed', 'no_show', 'rescheduled', 'cancelled_by_admin'] as const)(
    '%s offers no action',
    (status) => {
      expect(allowedLessonEvents(status)).toEqual([]);
    },
  );

  it('applies a valid event and rejects an invalid one with null', () => {
    expect(applyLessonEvent('scheduled', 'confirm')).toBe('confirmed');
    expect(applyLessonEvent('confirmed', 'mark_no_show')).toBe('no_show');
    expect(applyLessonEvent('confirmed', 'confirm')).toBeNull();
    expect(applyLessonEvent('completed', 'cancel_by_admin')).toBeNull();
  });

  it('the status route takes attendance outcomes only', () => {
    expect([...STATUS_ROUTE_EVENTS]).toEqual(['complete', 'mark_late', 'mark_no_show', 'excuse']);
  });
});

describe('cancellation and occupancy (R-SCH-04, R-SCH-07)', () => {
  it('maps who cancelled to a status; a student cancellation is an excuse', () => {
    expect(CANCEL_STATUS).toEqual({
      teacher: 'cancelled_by_teacher',
      admin: 'cancelled_by_admin',
      student: 'excused',
    });
  });

  it('cancelled, excused and moved lessons free the slot', () => {
    expect([...OCCUPYING_LESSON_STATUSES]).toEqual([
      'scheduled',
      'confirmed',
      'completed',
      'late',
      'no_show',
    ]);
  });

  it.each([
    ['scheduled', true],
    ['confirmed', true],
    ['completed', false],
    ['excused', false],
  ] as const)('%s is open: %s', (status, open) => {
    expect(isOpenLesson(status)).toBe(open);
  });
});
