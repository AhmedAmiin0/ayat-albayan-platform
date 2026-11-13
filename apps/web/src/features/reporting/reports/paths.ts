import { reportBlock, type LessonStatus, type UserRole } from '@ab/shared';

// Where a report is opened from (R-REP-01: always from the lesson itself).

/** Teacher: /teacher/report/:lessonId (every student of the lesson). Admin: under the student. */
export function reportFormHref(input: { role: UserRole; lessonId: string; studentId: string }): string {
  return input.role === 'admin'
    ? `/admin/students/${input.studentId}/reports/${input.lessonId}`
    : `/teacher/report/${input.lessonId}`;
}

/** «سجل التقارير»: the admin's page, or the teacher's student file on «التقارير» (docs/47). */
export function reportHistoryHref(role: UserRole, studentId: string): string {
  return role === 'admin'
    ? `/admin/students/${studentId}/reports`
    : `/teacher/students/${studentId}?tab=reports`;
}

/** The link shows once a report can be sent: the lesson started and was not cancelled or moved. */
export function reportOpen(lesson: { status: LessonStatus; starts_at: string }, now: Date): boolean {
  return reportBlock({ lessonStatus: lesson.status, lessonStartsAt: new Date(lesson.starts_at), now }) === null;
}
