import { describe, expect, it } from 'vitest';
import type { LessonStatus } from '@ab/catalog';
import { decideLessonOutcome, type OutcomeClock } from './lesson-outcome.js';

const MIN = 60_000;
const SINCE = new Date('2026-11-03T00:00:00Z');
// The lesson ends 2026-11-03 16:00 UTC (= 18:00 in Cairo, 19:00 in Riyadh).
const ENDS = '2026-11-03T16:00:00Z';
const clock = (now: string, graceMin = 30): OutcomeClock => ({
  now: new Date(now),
  graceMs: graceMin * MIN,
  since: SINCE,
});
const lesson = (status: LessonStatus, reminded = false, ends_at = ENDS) => ({
  status,
  ends_at,
  reminded,
});
const AFTER = clock('2026-11-03T16:30:00Z');

describe('decideLessonOutcome (owner 2026-11-03): each branch', () => {
  it('confirmed → completed, reminded or not', () => {
    expect(decideLessonOutcome(lesson('confirmed'), AFTER)).toBe('completed');
    expect(decideLessonOutcome(lesson('confirmed', true), AFTER)).toBe('completed');
  });

  it('scheduled with the platform reminder sent and no «نعم» → no_show', () => {
    expect(decideLessonOutcome(lesson('scheduled', true), AFTER)).toBe('no_show');
  });

  it('scheduled without a platform reminder → unresolved (stays «يحتاج تأكيد»)', () => {
    expect(decideLessonOutcome(lesson('scheduled'), AFTER)).toBe('unresolved');
  });

  it.each([
    'completed', 'late', 'no_show', 'excused', 'cancelled_by_teacher', 'cancelled_by_admin', 'rescheduled',
  ] as const)('%s is never touched', (status) => {
    expect(decideLessonOutcome(lesson(status, true), AFTER)).toBe('skip');
  });
});

describe('decideLessonOutcome: the grace', () => {
  it('waits until end + grace, then decides (the boundary instant is due)', () => {
    expect(decideLessonOutcome(lesson('confirmed'), clock('2026-11-03T16:29:59.999Z'))).toBe('wait');
    expect(decideLessonOutcome(lesson('confirmed'), clock('2026-11-03T16:30:00Z'))).toBe('completed');
  });

  it('follows the setting: 0 decides at the end, 90 waits an hour and a half', () => {
    expect(decideLessonOutcome(lesson('scheduled', true), clock(ENDS, 0))).toBe('no_show');
    expect(decideLessonOutcome(lesson('scheduled', true), clock('2026-11-03T17:00:00Z', 90))).toBe('wait');
    expect(decideLessonOutcome(lesson('scheduled', true), clock('2026-11-03T17:30:00Z', 90))).toBe('no_show');
  });

  it('a lesson still running is waited for', () => {
    expect(decideLessonOutcome(lesson('scheduled', true), clock('2026-11-03T15:50:00Z'))).toBe('wait');
  });
});

describe('decideLessonOutcome: timezones are instants', () => {
  it('an end written with an offset is the same instant (18:00+02:00 = 16:00Z)', () => {
    const cairo = lesson('scheduled', true, '2026-11-03T18:00:00+02:00');
    expect(decideLessonOutcome(cairo, clock('2026-11-03T16:29:00Z'))).toBe('wait');
    expect(decideLessonOutcome(cairo, clock('2026-11-03T16:30:00Z'))).toBe('no_show');
  });

  it('the cutoff compares instants: 01:00+03:00 on the 3rd is 22:00Z on the 2nd, before it', () => {
    const riyadh = lesson('confirmed', false, '2026-11-03T01:00:00+03:00');
    expect(decideLessonOutcome(riyadh, AFTER)).toBe('skip');
  });
});

describe('decideLessonOutcome: no retro change', () => {
  it('a lesson that ended before the cutoff is skipped, whatever its status', () => {
    const old = '2026-11-02T23:59:59.999Z';
    expect(decideLessonOutcome(lesson('scheduled', true, old), AFTER)).toBe('skip');
    expect(decideLessonOutcome(lesson('confirmed', false, old), AFTER)).toBe('skip');
  });

  it('one that ended exactly at the cutoff is the first one settled', () => {
    const at = lesson('scheduled', true, SINCE.toISOString());
    expect(decideLessonOutcome(at, clock('2026-11-03T00:30:00Z'))).toBe('no_show');
  });
});
