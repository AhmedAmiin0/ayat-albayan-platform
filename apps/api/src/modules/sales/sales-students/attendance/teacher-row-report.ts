import { canEditReport, editUntil, type AttendanceRowReport } from '@ab/shared';
import type { AttendanceReportRow } from './student-attendance.rows';

/** Her edit window: `minutes` = settings.report_teacher_edit_minutes (R-REP-02). */
export interface ReportWindow {
  now: Date;
  minutes: number;
}

const dateOf = (at: string | null): Date | null => (at === null ? null : new Date(at));
const isoOf = (at: Date | null): string | null => (at === null ? null : at.toISOString());

/** A submitted report of a log row as the teacher reads it: edit inside her window, else view. */
export function rowReport(report: AttendanceReportRow, w: ReportWindow): AttendanceRowReport {
  const submittedAt = dateOf(report.submitted_at);
  const sentAt = dateOf(report.sent_at);
  const input = { role: 'teacher', submittedAt, sentAt, now: w.now, minutes: w.minutes } as const;
  return {
    status: 'submitted',
    submitted_at: isoOf(submittedAt),
    sent_at: isoOf(sentAt),
    can_edit: canEditReport(input),
    edit_until: isoOf(editUntil(input)),
  };
}
