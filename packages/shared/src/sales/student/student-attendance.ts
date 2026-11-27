import { z } from 'zod';
import { addCalendarMonths, monthRangeIn, RIYADH_TZ, riyadhToday } from '@ab/time';
import { monthParam } from '@ab/money';
import type { AttendanceTableRow, AttendanceTotalKind } from '../student-file/attendance.schemas';
import { attendanceKind } from './student-details';

// One student's past lessons in a Riyadh month; never a price, payment, meeting link or note.

/** `?month=YYYY-MM` (optional: the current Riyadh month). */
export const attendanceMonthQuery = z.object({ month: monthParam.optional() });

/** "YYYY-MM" of an instant on the Riyadh calendar. */
export const riyadhMonthOf = (at: Date): string => riyadhToday(at).slice(0, 7);

/** The month after "YYYY-MM". */
export function nextMonth(month: string): string {
  return addCalendarMonths(month, 1).slice(0, 7);
}

/** [from, to) of a Riyadh month as UTC instants. */
export function riyadhMonthBounds(month: string): { from: Date; to: Date } {
  return monthRangeIn(month, RIYADH_TZ);
}

const ZERO = (): Record<AttendanceTotalKind, number> => ({
  held: 0,
  late: 0,
  absent: 0,
  excused: 0,
  cancelled_by_teacher: 0,
  cancelled_by_admin: 0,
  rescheduled: 0,
  unmarked: 0,
});

/** The kind of one row as the totals count it; `late` is counted on top of `held`. */
export function attendanceTotalKind(
  row: Pick<AttendanceTableRow, 'status' | 'attendance'>,
): AttendanceTotalKind {
  if (row.status === 'rescheduled') return 'rescheduled';
  if (row.status === 'cancelled_by_teacher' || row.status === 'cancelled_by_admin')
    return row.status;
  const kind = attendanceKind(row.status, row.attendance);
  return kind === 'present' ? 'held' : kind === 'absent' || kind === 'excused' ? kind : 'unmarked';
}

/** The month's totals of every kind. */
export function attendanceTableTotals(
  rows: readonly Pick<AttendanceTableRow, 'status' | 'attendance'>[],
): Record<AttendanceTotalKind, number> {
  const totals = ZERO();
  for (const row of rows) {
    const kind = attendanceTotalKind(row);
    totals[kind] += 1;
    if (kind === 'held' && row.attendance === 'late') totals.late += 1;
  }
  return totals;
}
