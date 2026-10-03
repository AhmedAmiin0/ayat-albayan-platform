import { describe, expect, it } from 'vitest';
import { LESSON_STATUSES } from '../enums/index.js';
import { lessonTimeEditSchema } from '../schemas/lesson-time.js';
import { timeEditMode } from './time-edit.js';

describe('timeEditMode (R-SCH-11)', () => {
  it('open lessons move, held lessons are corrected, everything else is closed', () => {
    const modes = Object.fromEntries(LESSON_STATUSES.map((s) => [s, timeEditMode(s)]));
    expect(modes).toEqual({
      scheduled: 'move',
      confirmed: 'move',
      completed: 'correct',
      late: 'correct',
      excused: null,
      no_show: null,
      cancelled_by_teacher: null,
      cancelled_by_admin: null,
      rescheduled: null,
    });
  });
});

describe('lessonTimeEditSchema', () => {
  const ok = { expectedStartsAt: '2026-10-04T14:00:00Z', startsAt: '2026-10-05T14:00:00Z', durationMin: 60 };

  it('takes instants and a 30/45/60/90 duration; the rest is optional', () => {
    expect(lessonTimeEditSchema.safeParse(ok).success).toBe(true);
    const full = { ...ok, reason: 'x', notify: false, override: { reason: 'y' } };
    expect(lessonTimeEditSchema.safeParse(full).success).toBe(true);
  });

  it('refuses free-text times, odd durations, a long reason and an empty override reason', () => {
    for (const bad of [
      { ...ok, startsAt: '17:00' },
      { ...ok, durationMin: 50 },
      { ...ok, reason: 'x'.repeat(301) },
      { ...ok, override: { reason: ' ' } },
      { startsAt: ok.startsAt, durationMin: 45 },
    ]) {
      expect(lessonTimeEditSchema.safeParse(bad).success).toBe(false);
    }
  });
});
