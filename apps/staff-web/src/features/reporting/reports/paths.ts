import type { ReportStage } from '@ab/client-core';
import { reportBlock } from '@ab/shared';
import type { LessonStatus, UserRole } from '@ab/catalog';
import { t } from '@ab/web-kit/lib/i18n/i18n';

// Where a report is opened from (R-REP-01: always from the lesson itself).

/** Teacher: /teacher/report/:lessonId (every student of the lesson). Admin: under the student. */
export function reportFormHref(input: { role: UserRole; lessonId: string; studentId: string }): string {
  return input.role === 'admin'
    ? `/admin/students/${input.studentId}/reports/${input.lessonId}`
    : `/teacher/report/${input.lessonId}`;
}

/** The admin's page, or the teacher's student file (docs/49: per lesson). */
export function reportHistoryHref(role: UserRole, studentId: string): string {
  return role === 'admin'
    ? `/admin/students/${studentId}/reports`
    : `/teacher/students/${studentId}`;
}

/** The link shows once a report can be sent: the lesson started and was not cancelled or moved. */
export function reportOpen(lesson: { status: LessonStatus; starts_at: string }, now: Date): boolean {
  return reportBlock({ lessonStatus: lesson.status, lessonStartsAt: new Date(lesson.starts_at), now }) === null;
}

/** The teacher's report control, by her report stage (docs/49 R2). */
export const REPORT_STAGE_LABEL: Record<ReportStage, string> = {
  write: t.reports.open,
  resume: t.reports.resume,
  window: t.reports.edit,
  done: t.reports.view,
};
