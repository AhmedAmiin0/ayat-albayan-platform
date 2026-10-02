import { describe, expect, it } from 'vitest';
import { findConflicts, type ConflictInput } from './conflicts';

const occ = (start: string, end: string) => ({
  starts_at: new Date(start),
  ends_at: new Date(end),
});
const SUN_16_20 = { weekday: 0, start_time: '16:00', end_time: '20:00', tz: 'Africa/Cairo' };
const P = occ('2026-10-04T14:00:00Z', '2026-10-04T14:45:00Z');
const base: ConflictInput = {
  proposed: [P],
  teacherLessons: [],
  studentLessons: [],
  availability: [SUN_16_20],
  timeOff: [],
};

describe('findConflicts — edges (R-SCH-04)', () => {
  it('nothing proposed → nothing to report', () => {
    expect(findConflicts({ ...base, proposed: [] })).toEqual([]);
  });

  it('back-to-back lessons (touching end and start) do not clash', () => {
    const teacherLessons = [
      { id: 'before', ...occ('2026-10-04T13:15:00Z', '2026-10-04T14:00:00Z') },
      { id: 'after', ...occ('2026-10-04T14:45:00Z', '2026-10-04T15:30:00Z') },
    ];
    expect(findConflicts({ ...base, teacherLessons })).toEqual([]);
  });

  it('a lesson exactly filling the window is inside it', () => {
    const full = occ('2026-10-04T13:00:00Z', '2026-10-04T17:00:00Z');
    expect(findConflicts({ ...base, proposed: [full] })).toEqual([]);
  });

  it('several kinds on one occurrence are all reported', () => {
    const timeOff = [
      { start: new Date('2026-10-04T00:00:00Z'), end: new Date('2026-10-05T00:00:00Z') },
    ];
    const teacherLessons = [{ id: 'L1', ...P }];
    const studentLessons = [{ id: 'L1', student_id: 'S1', ...P }];
    const kinds = findConflicts({ ...base, timeOff, teacherLessons, studentLessons }).map(
      (c) => c.kind,
    );
    expect(kinds).toEqual(['time_off', 'teacher_busy', 'student_busy']);
  });

  it('only the clashing occurrence of a weekly series is reported', () => {
    const next = occ('2026-10-11T14:00:00Z', '2026-10-11T14:45:00Z');
    const teacherLessons = [{ id: 'L9', ...next }];
    const out = findConflicts({ ...base, proposed: [P, next], teacherLessons });
    expect(out.map((c) => [c.kind, c.startsAt])).toEqual([
      ['teacher_busy', '2026-10-11T14:00:00.000Z'],
    ]);
  });

  it('windows touching across midnight merge, so a lesson spanning midnight fits', () => {
    const availability = [
      { weekday: 0, start_time: '22:00', end_time: '24:00', tz: 'Asia/Riyadh' },
      { weekday: 1, start_time: '00:00', end_time: '02:00', tz: 'Asia/Riyadh' },
    ];
    const midnight = occ('2026-10-04T20:30:00Z', '2026-10-04T21:15:00Z'); // 23:30–00:15 Riyadh
    expect(findConflicts({ ...base, availability, proposed: [midnight] })).toEqual([]);
  });

  it('an end of 23:59 (the UI last option) means midnight, so it merges with the next day', () => {
    const availability = [
      { weekday: 6, start_time: '22:00', end_time: '23:59', tz: 'Asia/Riyadh' },
      { weekday: 0, start_time: '00:00', end_time: '02:00', tz: 'Asia/Riyadh' },
    ];
    const midnight = occ('2026-10-03T20:30:00Z', '2026-10-03T21:30:00Z'); // Sat 23:30–Sun 00:30 Riyadh
    expect(findConflicts({ ...base, availability, proposed: [midnight] })).toEqual([]);
  });

  it('no availability at all → every occurrence is outside it', () => {
    expect(findConflicts({ ...base, availability: [] }).map((c) => c.kind)).toEqual([
      'outside_availability',
    ]);
  });
});
