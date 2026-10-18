import { describe, expect, it } from 'vitest';
import { plannedCourseEnd } from './booking.course-end';
import type { SeriesRule } from './booking.series-plan';

// Sun 17:00 + Tue 19:30 Riyadh (14:00Z / 16:30Z).
const rule: SeriesRule = {
  byday: [0, 2],
  startTimeLocal: '17:00',
  dayTimes: [{ weekday: 2, startTimeLocal: '19:30' }],
  tz: 'Asia/Riyadh',
  durationMin: 45,
  startsOn: '2026-10-04',
  single: false,
};

describe('plannedCourseEnd — the local date of the N-th lesson from now (owner 2026-10-18 decision 1)', () => {
  it('8 lessons from Sun 4 Oct end on Tue 27 Oct', () => {
    expect(plannedCourseEnd({ rule, now: new Date('2026-10-01T08:00:00Z'), lessonsTotal: 8 })).toBe('2026-10-27');
  });

  it('a lesson of the start week that already passed is not counted (review m5)', () => {
    const now = new Date('2026-10-04T15:00:00Z');
    expect(plannedCourseEnd({ rule, now, lessonsTotal: 8 })).toBe('2026-11-01');
  });

  it('reaches lessons far past any horizon: 24 lessons, 2 days a week → 12 weeks', () => {
    expect(plannedCourseEnd({ rule, now: new Date('2026-10-01T08:00:00Z'), lessonsTotal: 24 })).toBe('2026-12-22');
  });

  it('null with no days or no lessons to count', () => {
    const now = new Date('2026-10-01T08:00:00Z');
    expect(plannedCourseEnd({ rule: { ...rule, byday: [], dayTimes: [] }, now, lessonsTotal: 8 })).toBeNull();
    expect(plannedCourseEnd({ rule, now, lessonsTotal: 0 })).toBeNull();
  });
});
