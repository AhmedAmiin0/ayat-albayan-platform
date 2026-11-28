import type { LessonStatus } from '@ab/catalog';
import type { TeacherLessonKind, TeacherLessonTotals } from './teacher-overview.schemas';

/** The kind a lesson's status counts as; null while still open (not closed yet) or moved away. */
export function teacherLessonKind(status: LessonStatus): TeacherLessonKind | null {
  if (status === 'completed' || status === 'late') return 'held';
  if (status === 'no_show') return 'student_absent';
  if (status === 'cancelled_by_teacher' || status === 'cancelled_by_admin') return status;
  if (status === 'excused') return 'other';
  return null;
}

/** How many lessons of each kind (open and moved ones not counted). */
export function teacherLessonTotals(
  statuses: readonly LessonStatus[],
): TeacherLessonTotals {
  const totals: TeacherLessonTotals = {
    held: 0,
    student_absent: 0,
    cancelled_by_teacher: 0,
    cancelled_by_admin: 0,
    other: 0,
  };
  for (const status of statuses) {
    const kind = teacherLessonKind(status);
    if (kind) totals[kind] += 1;
  }
  return totals;
}
