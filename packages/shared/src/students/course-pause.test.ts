import { describe, expect, it } from 'vitest';
import {
  coursePauseProblem,
  coursePauseStartSchema,
  coursePauseUntilSchema,
  pauseCovers,
  pausedDays,
  resumeDayOf,
  shiftedOrNull,
} from './course-pause.js';

describe('course pause day arithmetic (mirrors migration 956)', () => {
  it('moves a date across months, years and a leap day; null stays null (no renewal date, an open-ended rule)', () => {
    expect(shiftedOrNull('2026-10-28', 5)).toBe('2026-11-02');
    expect(shiftedOrNull('2026-12-30', 3)).toBe('2027-01-02');
    expect(shiftedOrNull('2028-02-28', 1)).toBe('2028-02-29');
    expect(shiftedOrNull(null, 7)).toBeNull();
  });

  it('resumes on the day after until, or today when that is earlier', () => {
    expect(resumeDayOf({ until: '2026-11-05', today: '2026-11-20' })).toBe('2026-11-06');
    expect(resumeDayOf({ until: '2026-11-05', today: '2026-11-02' })).toBe('2026-11-02');
    expect(resumeDayOf({ until: null, today: '2026-11-02' })).toBe('2026-11-02');
  });

  it('counts the paused days once, never negative', () => {
    // 1 … 10 November paused, resumed automatically on the 11th: ten days.
    expect(pausedDays({ from: '2026-11-01', until: '2026-11-10', today: '2026-11-11' })).toBe(10);
    // A late job run still counts only the pause itself.
    expect(pausedDays({ from: '2026-11-01', until: '2026-11-10', today: '2026-11-30' })).toBe(10);
    // Ended early on the 4th.
    expect(pausedDays({ from: '2026-11-01', until: null, today: '2026-11-04' })).toBe(3);
    // Resumed before it started.
    expect(pausedDays({ from: '2026-11-10', until: null, today: '2026-11-04' })).toBe(0);
  });

  it('counts from the later of from and the course start (no over-extension of a course begun inside the pause)', () => {
    // 28 Oct … 10 Nov paused, the course starts on 8 Nov: only 8, 9, 10 Nov were paused for it.
    expect(pausedDays({ from: '2026-10-28', until: '2026-11-10', today: '2026-11-11', courseStart: '2026-11-08' })).toBe(3);
    // A course that started before the pause counts the whole pause.
    expect(pausedDays({ from: '2026-10-28', until: '2026-11-10', today: '2026-11-11', courseStart: '2026-10-01' })).toBe(14);
    // A course starting after the resume day does not move.
    expect(pausedDays({ from: '2026-10-28', until: '2026-11-10', today: '2026-11-11', courseStart: '2026-11-20' })).toBe(0);
    expect(pausedDays({ from: '2026-10-28', until: '2026-11-10', today: '2026-11-11', courseStart: null })).toBe(14);
  });

  it('refuses a past start and an until before the start', () => {
    expect(coursePauseProblem({ from: '2026-10-27', until: null, today: '2026-10-28' })).toBe('date_in_past');
    expect(coursePauseProblem({ from: '2026-10-29', until: '2026-10-28', today: '2026-10-28' })).toBe('invalid_range');
    expect(coursePauseProblem({ from: '2026-10-28', until: '2026-10-28', today: '2026-10-28' })).toBeNull();
  });

  it('covers today only while open and inside its days', () => {
    const open = { from_date: '2026-11-01', until_date: '2026-11-10', resumed_at: null };
    expect(pauseCovers(open, '2026-11-05')).toBe(true);
    expect(pauseCovers(open, '2026-10-31')).toBe(false);
    expect(pauseCovers(open, '2026-11-11')).toBe(false);
    expect(pauseCovers({ ...open, resumed_at: '2026-11-03T08:00:00Z' }, '2026-11-05')).toBe(false);
  });
});

describe('course pause bodies', () => {
  it('accepts an empty start (today, open-ended) and a reason; rejects unknown keys', () => {
    expect(coursePauseStartSchema.parse({})).toEqual({});
    expect(coursePauseStartSchema.parse({ untilDate: '2026-11-10', reason: ' سفر ' }).reason).toBe('سفر');
    expect(coursePauseStartSchema.safeParse({ fromDate: '2026-11-01', chargeable: true }).success).toBe(false);
    expect(coursePauseStartSchema.safeParse({ fromDate: '01/11/2026' }).success).toBe(false);
  });

  it('until is a date or null', () => {
    expect(coursePauseUntilSchema.parse({ untilDate: null })).toEqual({ untilDate: null });
    expect(coursePauseUntilSchema.safeParse({}).success).toBe(false);
  });
});
