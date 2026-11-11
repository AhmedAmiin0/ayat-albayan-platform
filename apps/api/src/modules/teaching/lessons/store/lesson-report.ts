import { canEditReport, editUntil, type LessonStudentView } from '@ab/shared';
import type { Role } from '@/common/auth/verify-token';
import type { LessonRow } from './lesson-row';

type Embedded = LessonRow['lesson_students'][number]['report'];
type ReportState = NonNullable<LessonStudentView['report']>;

/** Who reads the lesson, when, and settings.report_teacher_edit_minutes (docs/46 B7). */
export type ReportWindow = { role: Role | null; now: Date; minutes: number };

const instant = (iso: string | null | undefined): Date | null => (iso ? new Date(iso) : null);

/**
 * A lesson student's report with its edit window (R-REP-02, docs/46 B7): first submit, family
 * send, can_edit (canEditReport for the caller: the teacher until first submit + minutes, the admin
 * always, nobody else) and edit_until; null before a report is opened.
 */
export function lessonReport(report: Embedded, w: ReportWindow): ReportState | null {
  if (!report) return null;
  const submittedAt = instant(report.submitted_at);
  const until = editUntil({ submittedAt, minutes: w.minutes });
  return {
    id: report.id,
    status: report.status,
    submitted_at: submittedAt?.toISOString() ?? null,
    sent_at: instant(report.sent_at)?.toISOString() ?? null,
    can_edit: w.role !== null && canEditReport({ role: w.role, submittedAt, now: w.now, minutes: w.minutes }),
    edit_until: until?.toISOString() ?? null,
  };
}
