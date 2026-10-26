import { describe, expect, it } from 'vitest';
import { findConflicts, type ConflictInput } from './conflicts';

// Teacher free Sundays 16:00–20:00 Cairo; in October 2026 Cairo is UTC+3 → 13:00–17:00Z.
const SUN_16_20 = { weekday: 0, start_time: '16:00:00', end_time: '20:00:00', tz: 'Africa/Cairo' };
const occ = (start: string, end: string) => ({
  starts_at: new Date(start),
  ends_at: new Date(end),
});
const P = occ('2026-10-04T14:00:00Z', '2026-10-04T14:45:00Z'); // Sun 17:00–17:45 Cairo
const base: ConflictInput = {
  proposed: [P],
  teacherLessons: [],
  studentLessons: [],
  availability: [SUN_16_20],
  timeOff: [],
};
const at = { startsAt: '2026-10-04T14:00:00.000Z', endsAt: '2026-10-04T14:45:00.000Z' };

describe('findConflicts — one kind each (R-SCH-04, issue B3)', () => {
  it('inside availability with nothing booked is free', () => {
    expect(findConflicts(base)).toEqual([]);
  });

  it('outside_availability: another weekday', () => {
    const monday = occ('2026-10-05T14:00:00Z', '2026-10-05T14:45:00Z');
    expect(findConflicts({ ...base, proposed: [monday] })).toEqual([
      {
        kind: 'outside_availability',
        startsAt: '2026-10-05T14:00:00.000Z',
        endsAt: '2026-10-05T14:45:00.000Z',
      },
    ]);
  });

  it('outside_availability: runs past the end of the window', () => {
    const late = occ('2026-10-04T16:30:00Z', '2026-10-04T17:15:00Z'); // 19:30–20:15 Cairo
    expect(findConflicts({ ...base, proposed: [late] }).map((c) => c.kind)).toEqual([
      'outside_availability',
    ]);
  });

  it('time_off overlapping the lesson', () => {
    const timeOff = [
      { start: new Date('2026-10-04T14:30:00Z'), end: new Date('2026-10-04T18:00:00Z') },
    ];
    expect(findConflicts({ ...base, timeOff })).toEqual([{ kind: 'time_off', ...at }]);
  });

  it('teacher_busy names the lesson already there', () => {
    const teacherLessons = [{ id: 'L1', ...occ('2026-10-04T14:30:00Z', '2026-10-04T15:15:00Z') }];
    expect(findConflicts({ ...base, teacherLessons })).toEqual([
      { kind: 'teacher_busy', ...at, lessonId: 'L1' },
    ]);
  });

  it('student_busy names the lesson and the student', () => {
    const studentLessons = [
      { id: 'L2', student_id: 'S1', ...occ('2026-10-04T13:30:00Z', '2026-10-04T14:15:00Z') },
    ];
    expect(findConflicts({ ...base, studentLessons })).toEqual([
      { kind: 'student_busy', ...at, lessonId: 'L2', studentId: 'S1' },
    ]);
  });
});
