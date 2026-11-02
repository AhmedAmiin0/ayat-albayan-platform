import type { Attendance, Grade, PdfStatus, ReportStatus } from '@ab/catalog';

/**
 * GET /teachers/me/reports item (teacher mode, R-REP-02, R-TCH-03): one of my submitted reports,
 * newest submitted_at first. Drafts and missing reports stay in /teachers/me/pending-reports.
 */
export interface TeacherReportView {
  id: string;
  lesson_id: string;
  /** The lesson's start (ISO UTC). */
  starts_at: string;
  student: { id: string; code: string; name: string };
  attendance: Attendance | null;
  grade_overall: Grade | null;
  status: ReportStatus;
  submitted_at: string | null;
  /** canEditReport for the teacher, now (settings.report_teacher_edit_hours after submit). */
  can_edit: boolean;
  /** End of the teacher's edit window (editUntil). */
  edit_until: string | null;
  pdf_status: PdfStatus | null;
  sent_at: string | null;
}
