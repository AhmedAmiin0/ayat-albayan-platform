import { z } from 'zod';
import type { Attendance, LessonStatus } from '../../enums/index.js';
import { addCalendarMonths, monthRangeIn, RIYADH_TZ, riyadhToday } from '@ab/time';
import { monthParam } from '../../money/ledger/index.js';
import { attendanceKind, type AttendanceKind } from './student-details.js';

// «سجل الحضور» (owner 2026-10-28): every past lesson of one student in a Riyadh month, as a table.
// GET /sales/students/:id/attendance (self.sales_academy) and
// GET /students/:id/attendance (students.read).
// Whitelist: never a price, a payment, a meeting link or a note.

/** `?month=YYYY-MM` (optional: the current Riyadh month). */
export const attendanceMonthQuery = z.object({ month: monthParam.optional() });

/** One past lesson of the student. `kind` is «الحضور»'s (attendanceKind); null when moved. */
export interface AttendanceTableRow {
  lesson_id: string;
  starts_at: string;
  duration_min: number;
  teacher_name: string | null;
  status: LessonStatus;
  /** The student's own lesson_students.attendance (on_time / late / absent / excused), null: unmarked. */
  attendance: Attendance | null;
  kind: AttendanceKind | null;
  /** A report of this student for this lesson was submitted (sent). */
  report_sent: boolean;
  /** That report's id (it opens for any student, owner 2026-10-30); else null. */
  report_id: string | null;
  /** Only for a cancelled lesson. */
  cancel_reason: string | null;
  is_trial: boolean;
  is_makeup: boolean;
  /** This lesson replaced a moved one. */
  is_rescheduled: boolean;
}

/**
 * held = حضر (completed / late or marked present), late = marked late (part of held), cancelled per
 * side, rescheduled = moved away.
 */
export type AttendanceTotalKind =
  | 'held'
  | 'late'
  | 'absent'
  | 'excused'
  | 'cancelled_by_teacher'
  | 'cancelled_by_admin'
  | 'rescheduled'
  | 'unmarked';

export interface StudentAttendanceTable {
  /** "YYYY-MM" in Riyadh. */
  month: string;
  /** Every Riyadh month with a past lesson, newest first (the current one always). */
  months: string[];
  /** Newest first. */
  items: AttendanceTableRow[];
  totals: Record<AttendanceTotalKind, number>;
  /** Hers (the sales tree; always true for the admin); a sent report opens either way (2026-10-30). */
  mine: boolean;
}

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
  held: 0, late: 0, absent: 0, excused: 0,
  cancelled_by_teacher: 0, cancelled_by_admin: 0, rescheduled: 0, unmarked: 0,
});

/** The kind of one row as the totals count it; `late` is counted on top of `held`. */
export function attendanceTotalKind(row: Pick<AttendanceTableRow, 'status' | 'attendance'>): AttendanceTotalKind {
  if (row.status === 'rescheduled') return 'rescheduled';
  if (row.status === 'cancelled_by_teacher' || row.status === 'cancelled_by_admin') return row.status;
  const kind = attendanceKind(row.status, row.attendance);
  return kind === 'present' ? 'held' : kind === 'absent' || kind === 'excused' ? kind : 'unmarked';
}

/** The month's totals of every kind. */
export function attendanceTableTotals(rows: readonly Pick<AttendanceTableRow, 'status' | 'attendance'>[]): Record<AttendanceTotalKind, number> {
  const totals = ZERO();
  for (const row of rows) {
    const kind = attendanceTotalKind(row);
    totals[kind] += 1;
    if (kind === 'held' && row.attendance === 'late') totals.late += 1;
  }
  return totals;
}
