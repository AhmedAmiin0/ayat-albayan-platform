import type { Attendance, LessonStatus } from '@ab/catalog';
import { attendanceKind, type AttendanceKind } from '../../sales/student/student-details.js';

/**
 * The teacher's reading of one lesson for one student (docs/46 C5): the student's own attendance
 * wins, else the lesson status. A completed lesson with no attendance was closed by the auto-held
 * job with no report since: «لم يُسجَّل», never present. Moved lessons: null (not a day of their own).
 */
export function teacherAttendanceKind(
  status: LessonStatus,
  attendance: Attendance | null,
): AttendanceKind | null {
  const autoHeld = status === 'completed' && attendance === null;
  return autoHeld ? 'unmarked' : attendanceKind(status, attendance);
}

export type AttendanceCounts = Record<AttendanceKind, number>;

export const zeroCounts = (): AttendanceCounts => ({
  present: 0,
  absent: 0,
  excused: 0,
  cancelled: 0,
  unmarked: 0,
});

/** Counts of each kind; null kinds (moved lessons) are skipped. */
export function countKinds(kinds: readonly (AttendanceKind | null)[]): AttendanceCounts {
  const counts = zeroCounts();
  for (const kind of kinds) if (kind) counts[kind] += 1;
  return counts;
}

/**
 * present ÷ (present + absent + excused) as a whole percent (docs/46 C5); null when nothing was
 * marked yet. Cancelled and unmarked lessons are not in the base.
 */
export function attendanceRate(
  counts: Pick<AttendanceCounts, 'present' | 'absent' | 'excused'>,
): number | null {
  const base = counts.present + counts.absent + counts.excused;
  return base === 0 ? null : Math.round((counts.present / base) * 100);
}
