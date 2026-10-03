import type { Attendance, Grade, LessonStatus, PdfStatus, Program, ReportStatus } from '@ab/shared';

// Selects + structural row types for the reports module (service role; callers guard).

const REPORT_COLUMNS =
  'id, lesson_id, student_id, teacher_id, attendance, program, recited, new_memorization, revision, theory, grade_recitation, grade_memorization, grade_revision, grade_tajweed, grade_engagement, grade_commitment, grade_overall, notes, homework, next_plan, status, version, submitted_at, edited_at, pdf_path, pdf_status, pdf_error, sent_at' as const;

/** One report with its attachments (ReportView). */
export const REPORT_SELECT =
  `${REPORT_COLUMNS}, attachments:report_attachments(id, storage_path, mime, size, created_at)` as const;

export type ReportAttachmentRow = {
  id: string;
  storage_path: string;
  mime: string;
  size: number;
  created_at: string;
};

export type ReportRow = {
  id: string;
  lesson_id: string;
  student_id: string;
  teacher_id: string;
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
  status: ReportStatus;
  version: number;
  submitted_at: string | null;
  edited_at: string | null;
  pdf_path: string | null;
  pdf_status: PdfStatus | null;
  pdf_error: string | null;
  sent_at: string | null;
  attachments: ReportAttachmentRow[];
};

/** The lesson a report belongs to: identity for the form (R-REP-01) and the outcome for a submit. */
export const REPORT_LESSON_SELECT =
  'id, teacher_id, starts_at, ends_at, status, meeting_link, teacher:teachers(id, display_name_ar, display_name_en, tz), lesson_students(student_id, attendance, chargeable, student:students(id, code, name, tz, program))' as const;

export type ReportLessonStudent = {
  student_id: string;
  attendance: Attendance | null;
  chargeable: boolean;
  /** code is a generated column, typed nullable by the generator; never null in practice. */
  student: { id: string; code: string | null; name: string; tz: string; program: Program } | null;
};

export type ReportLessonRow = {
  id: string;
  teacher_id: string;
  starts_at: string;
  ends_at: string;
  status: LessonStatus;
  meeting_link: string | null;
  teacher: { id: string; display_name_ar: string; display_name_en: string | null; tz: string } | null;
  lesson_students: ReportLessonStudent[];
};
