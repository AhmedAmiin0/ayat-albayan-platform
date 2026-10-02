import type { Attendance, Grade, PdfStatus, ReportStatus } from '@ab/shared';

/**
 * GET /teachers/me/reports items: my sent reports, newest first (R-TCH-03, R-REP-05).
 * TODO(merge): defined here until teacher-mode step 0 adds TeacherReportView to @ab/shared.
 */
export interface TeacherReportView {
  id: string;
  lesson_id: string;
  starts_at: string;
  student: { id: string; code: string; name: string };
  attendance: Attendance | null;
  grade_overall: Grade | null;
  status: ReportStatus;
  submitted_at: string | null;
  can_edit: boolean;
  edit_until: string | null;
  pdf_status: PdfStatus | null;
  sent_at: string | null;
}
