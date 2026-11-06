import type { Json } from '@ab/db';
import type { Attendance, Grade, PdfStatus, Program, ReportStatus } from '@ab/shared';

/** How a page is asked for: the link's public id, or a signed-in app's report uuid. */
export interface PageKey {
  by: 'public' | 'id';
  value: string;
}

export interface PageFileRow {
  id: string;
  storage_path: string;
  mime: string;
  size: number;
  created_at: string;
}

/** The submitted report the page shows (report-page.repo's select). */
export interface PageReportRow {
  id: string;
  public_id: string;
  lesson_id: string;
  student_id: string;
  teacher_id: string;
  status: ReportStatus;
  version: number;
  form_version: number;
  attendance: Attendance | null;
  program: Program | null;
  recited: string | null;
  new_memorization: string | null;
  revision: string | null;
  theory: string | null;
  grade_recitation: Grade | null;
  grade_memorization: Grade | null;
  grade_revision: Grade | null;
  grade_tajweed: Grade | null;
  grade_engagement: Grade | null;
  grade_commitment: Grade | null;
  grade_overall: Grade | null;
  notes: string | null;
  homework: string | null;
  next_plan: string | null;
  content: Json | null;
  submitted_at: string | null;
  edited_at: string | null;
  /** The family's report message went (report_ready / report_ready_family). */
  sent_at: string | null;
  pdf_status: PdfStatus | null;
  pdf_path: string | null;
  attachments: PageFileRow[];
}

/** Who the report is about: the readers' check and the page's names. */
export interface PageFacts {
  lesson: { starts_at: string; ends_at: string };
  /** code is a generated column (never null in practice). */
  student: {
    name: string;
    code: string | null;
    tz: string;
    profile_id: string | null;
    guardian: { id: string; profile_id: string | null } | null;
  };
  teacher: { display_name_ar: string; profile_id: string | null };
}
