import { describe, expect, it } from 'vitest';
import { findConflicts, type ConflictInput } from '../../scheduling/conflicts';
import { ruleOccurrences } from '../../scheduling/occurrences';

// The booking ConflictChecker over a whole series (R-SCH-04, R-SCH-01, issue B3). Egypt leaves DST
// at the end of Thu 2026-10-29 (UTC+3 → UTC+2); Riyadh stays UTC+3. Sundays: Oct 18, 25, Nov 1, 8.
const window = { from: new Date('2026-10-18T00:00:00Z'), to: new Date('2026-11-09T00:00:00Z') };
const SUN_16_20_CAIRO = { weekday: 0, start_time: '16:00', end_time: '20:00', tz: 'Africa/Cairo' };
const rule = (start: string, tz: string) =>
  ruleOccurrences(
    { byday: [0], start_time_local: start, duration_min: 45, tz, starts_on: '2026-10-01', ends_on: null },
    window,
  );
const base = (proposed: ConflictInput['proposed']): ConflictInput => ({
  proposed,
  teacherLessons: [],
  studentLessons: [],
  availability: [SUN_16_20_CAIRO],
  timeOff: [],
});
const span = (start: string, end: string) => ({ starts_at: new Date(start), ends_at: new Date(end) });

describe('ConflictChecker across DST (R-SCH-04, R-SCH-01)', () => {
  it('a Riyadh 16:00 series leaves a Cairo 16:00–20:00 grid once Cairo falls back', () => {
    // 13:00Z = 16:00 Cairo (UTC+3) until Oct 29, then 15:00 Cairo (UTC+2): outside the grid.
    const out = findConflicts(base(rule('16:00', 'Asia/Riyadh')));
    expect(out.map((c) => [c.kind, c.startsAt])).toEqual([
      ['outside_availability', '2026-11-01T13:00:00.000Z'],
      ['outside_availability', '2026-11-08T13:00:00.000Z'],
    ]);
  });

  it('a Cairo wall-clock series keeps fitting the Cairo grid on both sides of the change', () => {
    const occurrences = rule('17:00', 'Africa/Cairo');
    expect(occurrences.map((o) => o.starts_at.toISOString())).toEqual([
      '2026-10-18T14:00:00.000Z',
      '2026-10-25T14:00:00.000Z',
      '2026-11-01T15:00:00.000Z',
      '2026-11-08T15:00:00.000Z',
    ]);
    expect(findConflicts(base(occurrences))).toEqual([]);
  });

  it('a lesson at the same UTC instant clashes only after the shift', () => {
    const teacherLessons = [
      { id: 'before', ...span('2026-10-25T15:00:00Z', '2026-10-25T15:45:00Z') },
      { id: 'after', ...span('2026-11-01T15:00:00Z', '2026-11-01T15:45:00Z') },
    ];
    const out = findConflicts({ ...base(rule('17:00', 'Africa/Cairo')), teacherLessons });
    expect(out).toEqual([
      {
        kind: 'teacher_busy',
        startsAt: '2026-11-01T15:00:00.000Z',
        endsAt: '2026-11-01T15:45:00.000Z',
        lessonId: 'after',
      },
    ]);
  });
});

describe('ConflictChecker across midnight (R-SCH-04)', () => {
  const lateGrid = [
    { weekday: 0, start_time: '22:00', end_time: '24:00', tz: 'Asia/Riyadh' },
    { weekday: 1, start_time: '00:00', end_time: '02:00', tz: 'Asia/Riyadh' },
  ];
  const midnight = span('2026-10-04T21:00:00Z', '2026-10-04T21:45:00Z'); // Mon 00:00–00:45 Riyadh

  it('a student lesson running past midnight blocks the one right after it', () => {
    const studentLessons = [
      { id: 'L7', student_id: 'S1', ...span('2026-10-04T20:30:00Z', '2026-10-04T21:15:00Z') },
    ];
    const input = { ...base([midnight]), availability: lateGrid, studentLessons };
    expect(findConflicts(input).map((c) => [c.kind, c.lessonId, c.studentId])).toEqual([
      ['student_busy', 'L7', 'S1'],
    ]);
  });

  it('time-off ending exactly at midnight does not touch a lesson starting at midnight', () => {
    const timeOff = [{ start: new Date('2026-10-04T18:00:00Z'), end: new Date('2026-10-04T21:00:00Z') }];
    expect(findConflicts({ ...base([midnight]), availability: lateGrid, timeOff })).toEqual([]);
  });

  it('a student lesson ending exactly when the new one starts is not a clash', () => {
    const studentLessons = [
      { id: 'L8', student_id: 'S1', ...span('2026-10-04T20:15:00Z', '2026-10-04T21:00:00Z') },
    ];
    expect(findConflicts({ ...base([midnight]), availability: lateGrid, studentLessons })).toEqual([]);
  });
});
