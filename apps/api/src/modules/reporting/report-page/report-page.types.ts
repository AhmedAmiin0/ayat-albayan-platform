import type { Tables } from '@ab/db';

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

/** The lesson_reports columns the page reads (report-page.repo's select). */
type ReportColumns = Pick<
  Tables<'lesson_reports'>,
  | 'id'
  | 'public_id'
  | 'lesson_id'
  | 'student_id'
  | 'teacher_id'
  | 'status'
  | 'version'
  | 'form_version'
  | 'attendance'
  | 'program'
  | 'recited'
  | 'new_memorization'
  | 'revision'
  | 'theory'
  | Rubric
  | 'grade_overall'
  | 'notes'
  | 'homework'
  | 'next_plan'
  | 'content'
  | 'submitted_at'
  | 'edited_at'
  | 'sent_at'
  | 'pdf_status'
  | 'pdf_path'
>;

/** The rubric grade columns (grade_recitation …). */
type Rubric =
  `grade_${'recitation' | 'memorization' | 'revision' | 'tajweed' | 'engagement' | 'commitment'}`;

/** The submitted report the page shows, with its teacher's files. */
export interface PageReportRow extends ReportColumns {
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
