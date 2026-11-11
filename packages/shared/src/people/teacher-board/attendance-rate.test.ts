import { describe, expect, it } from 'vitest';
import { attendanceRate, countKinds, teacherAttendanceKind, zeroCounts } from './attendance-rate.js';

describe('teacherAttendanceKind', () => {
  it('auto-held (completed, no attendance) is unmarked, not present', () => {
    expect(teacherAttendanceKind('completed', null)).toBe('unmarked');
  });

  it('the student attendance wins', () => {
    expect(teacherAttendanceKind('completed', 'on_time')).toBe('present');
    expect(teacherAttendanceKind('completed', 'late')).toBe('present');
    expect(teacherAttendanceKind('completed', 'absent')).toBe('absent');
    expect(teacherAttendanceKind('excused', 'excused')).toBe('excused');
  });

  it('falls back on the status', () => {
    expect(teacherAttendanceKind('no_show', null)).toBe('absent');
    expect(teacherAttendanceKind('late', null)).toBe('present');
    expect(teacherAttendanceKind('cancelled_by_teacher', null)).toBe('cancelled');
    expect(teacherAttendanceKind('scheduled', null)).toBe('unmarked');
    expect(teacherAttendanceKind('rescheduled', null)).toBeNull();
  });
});

describe('countKinds', () => {
  it('counts each kind and skips moved lessons', () => {
    expect(countKinds(['present', 'present', 'absent', null, 'unmarked'])).toEqual({
      ...zeroCounts(), present: 2, absent: 1, unmarked: 1,
    });
  });
});

describe('attendanceRate', () => {
  it('present ÷ (present + absent + excused), whole percent', () => {
    expect(attendanceRate({ present: 2, absent: 1, excused: 0 })).toBe(67);
    expect(attendanceRate({ present: 3, absent: 0, excused: 1 })).toBe(75);
    expect(attendanceRate({ present: 4, absent: 0, excused: 0 })).toBe(100);
  });

  it('null when nothing was marked', () => {
    expect(attendanceRate({ present: 0, absent: 0, excused: 0 })).toBeNull();
  });

  it('cancelled and unmarked are not in the base', () => {
    expect(attendanceRate({ ...zeroCounts(), present: 1, cancelled: 5, unmarked: 3 })).toBe(100);
  });
});
