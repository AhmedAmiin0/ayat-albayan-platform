import type { Attendance, LessonStatus } from '@ab/catalog';
import { isCancelledLesson } from '@ab/schedule';
import type { AttendanceKind, SalesAttendanceDay } from './details-answer.schemas';

// How a past lesson reads in a student's attendance (docs/16 row 36).

const HELD: readonly LessonStatus[] = ['completed', 'late'];

/** Own attendance wins, else the status; a rescheduled lesson is null, its new one counts. */
export function attendanceKind(
  status: LessonStatus,
  attendance: Attendance | null,
): AttendanceKind | null {
  if (status === 'rescheduled') return null;
  if (isCancelledLesson(status)) return 'cancelled';
  if (attendance === 'on_time' || attendance === 'late') return 'present';
  if (attendance === 'absent') return 'absent';
  if (attendance === 'excused') return 'excused';
  if (HELD.includes(status)) return 'present';
  if (status === 'no_show') return 'absent';
  return status === 'excused' ? 'excused' : 'unmarked';
}

const ZERO = (): Record<AttendanceKind, number> => ({
  present: 0,
  absent: 0,
  excused: 0,
  cancelled: 0,
  unmarked: 0,
});

/** How many days of each kind. */
export function attendanceTotals(
  days: readonly Pick<SalesAttendanceDay, 'kind'>[],
): Record<AttendanceKind, number> {
  const totals = ZERO();
  for (const d of days) totals[d.kind] += 1;
  return totals;
}
