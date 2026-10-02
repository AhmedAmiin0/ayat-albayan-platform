import type { Attendance, Grade, PdfStatus, ReportStatus } from '@ab/shared';

// Defined here until the shared contract lands (teacher-mode spec §2: packages/shared/src/reports/
// views.ts). Same shape as the API's GET /teachers/me/reports rows; move to @ab/shared on merge.

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
