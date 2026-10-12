import { describe, expect, it } from 'vitest';
import { allDayRows } from '../teachers/availability/free-slots';
import { findConflicts, type ConflictInput } from './conflicts';

// settings.teachers_always_available: the grid is every day 00:00–24:00 Riyadh (UTC+3).
const occ = (start: string, end: string) => ({ starts_at: new Date(start), ends_at: new Date(end) });
const AT_3 = occ('2026-10-04T00:00:00Z', '2026-10-04T00:45:00Z'); // Sun 03:00–03:45 Riyadh
const OVER_MIDNIGHT = occ('2026-10-04T20:30:00Z', '2026-10-04T21:15:00Z'); // Sun 23:30 → Mon 00:15
const base: ConflictInput = {
  proposed: [AT_3, OVER_MIDNIGHT],
  teacherLessons: [],
  studentLessons: [],
  availability: allDayRows('Asia/Riyadh'),
  timeOff: [],
};

describe('findConflicts with every teacher available 24/7', () => {
  it('03:00 and a lesson across midnight are inside availability', () => {
    expect(findConflicts(base)).toEqual([]);
  });

  it('a teacher whose saved grid is in Cairo is open across the DST change too', () => {
    // Cairo falls back at the end of Thu 2026-10-29: the days still touch, no gap at midnight.
    const atChange = occ('2026-10-29T20:30:00Z', '2026-10-29T22:30:00Z');
    expect(findConflicts({ ...base, availability: allDayRows('Africa/Cairo'), proposed: [atChange] })).toEqual([]);
  });

  it('time off, the teacher\'s lessons and the students\' lessons still clash', () => {
    const res = findConflicts({
      ...base,
      proposed: [AT_3],
      timeOff: [{ start: new Date('2026-10-03T21:00:00Z'), end: new Date('2026-10-04T21:00:00Z') }],
      teacherLessons: [{ id: 'T', ...AT_3 }],
      studentLessons: [{ id: 'S', student_id: 's1', ...AT_3 }],
    });
    expect(res.map((c) => c.kind)).toEqual(['time_off', 'teacher_busy', 'student_busy']);
  });

  it('without the switch the saved grid still says outside_availability at 03:00', () => {
    const evening = [{ weekday: 0, start_time: '16:00', end_time: '22:00', tz: 'Asia/Riyadh' }];
    expect(findConflicts({ ...base, proposed: [AT_3], availability: evening }).map((c) => c.kind)).toEqual([
      'outside_availability',
    ]);
  });
});
