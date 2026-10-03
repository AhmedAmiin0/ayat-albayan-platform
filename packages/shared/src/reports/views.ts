import type {
  Attendance,
  Grade,
  LessonStatus,
  PdfStatus,
  Program,
  ReportStatus,
} from '../enums/index.js';
import type { BalanceView } from '../money/views.js';
import type { Rubric } from './rules.js';

// Phase 3 report responses (docs/11 §4). snake_case rows like every API response; instants are
// ISO-8601 UTC strings.

export interface ReportAttachmentView {
  id: string;
  storage_path: string;
  mime: string;
  size: number;
  created_at: string;
}

/** One lesson_reports row as the form and the history read it. */
export interface ReportView {
  id: string;
  lesson_id: string;
  student_id: string;
  teacher_id: string;
  attendance: Attendance | null;
  /** «البرنامج *»: the program this lesson was taught in; null only on a row older than migration 167. */
  program: Program | null;
  recited: string | null;
  new_memorization: string | null;
  revision: string | null;
  theory: string | null;
  grades: Record<Rubric, Grade | null>;
  grade_overall: Grade | null;
  notes: string | null;
  homework: string | null;
  next_plan: string | null;
  status: ReportStatus;
  version: number;
  submitted_at: string | null;
  edited_at: string | null;
  pdf_status: PdfStatus | null;
  pdf_error: string | null;
  sent_at: string | null;
  attachments: ReportAttachmentView[];
  /** canEditReport for the caller, now. */
  can_edit: boolean;
  /** End of the teacher's edit window (editUntil); null while a draft. */
  edit_until: string | null;
}

/** Read-only identity the form shows (R-REP-01): never typed, taken from the lesson. */
export interface ReportFormLesson {
  id: string;
  starts_at: string;
  ends_at: string;
  status: LessonStatus;
  meeting_link: string | null;
  teacher: { id: string; display_name_ar: string; display_name_en?: string | null; tz: string };
}

export interface ReportFormEntry {
  student: { id: string; code: string; name: string; tz: string; program: Program };
  /**
   * «رقم الحلقة» (R-LES-03, issue A5): v_lesson_sequence.seq once the lesson is completed, else
   * the student's completed lessons before this one + 1.
   */
  lesson_no: number;
  /** The package the lesson counts against (v_subscription_balance), null without one. */
  package: BalanceView | null;
  report: ReportView;
}

/** GET /lessons/:id/report-form: one entry per student on the lesson (group lessons, R-STU-04). */
export interface ReportFormResponse {
  lesson: ReportFormLesson;
  entries: ReportFormEntry[];
  /** reportBlock(...) for a submit now; drafts can always be saved. */
  submit_block: 'lesson_cancelled' | 'not_started' | null;
}

/** One point of the progress chart (R-REP-05): gradeScore of each rubric, 5 = ممتاز … 1. */
export interface GradePoint {
  report_id: string;
  lesson_id: string;
  starts_at: string;
  overall: number | null;
  rubrics: Record<Rubric, number | null>;
}

/** History row: the report plus its lesson's time and number. */
export interface ReportSummaryView {
  id: string;
  lesson_id: string;
  starts_at: string;
  lesson_no: number | null;
  teacher: { id: string; display_name_ar: string };
  attendance: Attendance | null;
  grade_overall: Grade | null;
  status: ReportStatus;
  version: number;
  pdf_status: PdfStatus | null;
  sent_at: string | null;
}

/** GET /students/:id/reports (R-REP-05, issue D2): submitted reports, newest first + the series. */
export interface StudentReportsResponse {
  items: ReportSummaryView[];
  total: number;
  page: number;
  pageSize: number;
  /** Oldest first, every submitted report of the student (not only this page). */
  series: GradePoint[];
}

/** GET /teachers/me/pending-reports (R-TCH-03): started lessons still missing a submitted report. */
export interface PendingReportView {
  lesson_id: string;
  starts_at: string;
  status: LessonStatus;
  student: { id: string; code: string; name: string };
  report_id: string | null;
}

/** A signed URL to PUT a file to (Storage createSignedUploadUrl). */
export interface SignedUpload {
  bucket: string;
  path: string;
  token: string;
  signed_url: string;
}

/** A signed URL to GET a private file. */
export interface SignedDownload {
  url: string;
  expires_at: string;
}
