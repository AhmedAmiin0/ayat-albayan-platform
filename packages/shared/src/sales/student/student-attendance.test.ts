import { describe, expect, it } from 'vitest';
import {
  attendanceMonthQuery,
  attendanceTableTotals,
  attendanceTotalKind,
  nextMonth,
  riyadhMonthBounds,
  riyadhMonthOf,
} from './student-attendance.js';

describe('Riyadh months', () => {
  it('starts and ends a month at Riyadh midnight (UTC+3)', () => {
    const { from, to } = riyadhMonthBounds('2026-10');
    expect(from.toISOString()).toBe('2026-09-30T21:00:00.000Z');
    expect(to.toISOString()).toBe('2026-10-31T21:00:00.000Z');
  });

  it('rolls December into the next year', () => {
    expect(nextMonth('2026-12')).toBe('2027-01');
    expect(riyadhMonthBounds('2026-12').to.toISOString()).toBe('2026-12-31T21:00:00.000Z');
  });

  it('reads the month of an instant in Riyadh, not UTC', () => {
    expect(riyadhMonthOf(new Date('2026-10-31T21:30:00Z'))).toBe('2026-11');
    expect(riyadhMonthOf(new Date('2026-10-31T20:59:00Z'))).toBe('2026-10');
  });

  it('accepts an optional YYYY-MM only', () => {
    expect(attendanceMonthQuery.safeParse({}).success).toBe(true);
    expect(attendanceMonthQuery.safeParse({ month: '2026-10' }).success).toBe(true);
    expect(attendanceMonthQuery.safeParse({ month: '2026-13' }).success).toBe(false);
    expect(attendanceMonthQuery.safeParse({ month: '10-2026' }).success).toBe(false);
  });
});

describe('attendanceTotalKind', () => {
  it.each([
    ['completed', null, 'held'],
    ['late', null, 'held'],
    ['completed', 'late', 'held'],
    ['completed', 'absent', 'absent'],
    ['no_show', null, 'absent'],
    ['excused', null, 'excused'],
    ['cancelled_by_teacher', null, 'cancelled_by_teacher'],
    ['cancelled_by_admin', 'on_time', 'cancelled_by_admin'],
    ['rescheduled', null, 'rescheduled'],
    ['scheduled', null, 'unmarked'],
  ] as const)('%s + %s = %s', (status, attendance, kind) => {
    expect(attendanceTotalKind({ status, attendance })).toBe(kind);
  });
});

describe('attendanceTableTotals', () => {
  it('counts each kind, late on top of held', () => {
    const totals = attendanceTableTotals([
      { status: 'completed', attendance: 'on_time' },
      { status: 'completed', attendance: 'late' },
      { status: 'no_show', attendance: null },
      { status: 'excused', attendance: 'excused' },
      { status: 'cancelled_by_teacher', attendance: null },
      { status: 'cancelled_by_admin', attendance: null },
      { status: 'rescheduled', attendance: null },
      { status: 'confirmed', attendance: null },
    ]);
    expect(totals).toEqual({
      held: 2, late: 1, absent: 1, excused: 1, cancelled_by_teacher: 1, cancelled_by_admin: 1, rescheduled: 1, unmarked: 1,
    });
  });
});
