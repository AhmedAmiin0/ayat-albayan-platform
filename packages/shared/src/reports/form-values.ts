import type { Attendance, Grade, Program } from '../enums/index.js';
import { attended, REPORT_RUBRICS, type Rubric } from './rules.js';
import { REPORT_REQUIRED_TEXT, reportSubmitSchema, type ReportDraft } from './schema.js';
import type { ReportView } from './views.js';

// «تقرير الحلقة» form state shared by web and mobile (R-REP-01, R-REP-02, docs/01 T7): the same
// fields in the same order on both, and the same autosave rule.

/** What the teacher edits (R-REP-02); identity never (R-REP-01). Text fields are '' when empty. */
export interface FormValues {
  attendance: Attendance | null;
  /** «البرنامج *»: prefilled from the student, the teacher may change it. */
  program: Program | null;
  recited: string;
  newMemorization: string;
  revision: string;
  theory: string;
  grades: Record<Rubric, Grade | null>;
  overall: Grade | null;
  notes: string;
  homework: string;
  nextPlan: string;
}

export type TextKey = 'recited' | 'newMemorization' | 'revision' | 'theory' | 'notes' | 'homework' | 'nextPlan';

/** PUT /reports/:id/draft body (only the fields sent are written). */
export type DraftBody = Partial<ReportDraft>;
/** POST /reports/:id/submit body. */
export type SubmitBody = DraftBody & { expectedVersion: number };

/** The four «اللي اتعمل في الحلقة» fields, then the three after the grades, in form order. */
export const DONE_FIELDS = ['recited', 'newMemorization', 'revision', 'theory'] as const satisfies readonly TextKey[];
export const AFTER_FIELDS = ['notes', 'homework', 'nextPlan'] as const satisfies readonly TextKey[];

const REQUIRED: readonly TextKey[] = REPORT_REQUIRED_TEXT;

/**
 * Required like on the Google Form (research-forms 12) unless the student was absent / excused,
 * and only until the report was first sent (`version` 0): a correction never needs a new field.
 */
export function textRequired(key: TextKey, attendance: Attendance | null, version = 0): boolean {
  return version === 0 && REQUIRED.includes(key) && (attendance === null || attended(attendance));
}

/** Typing pause before a draft is saved (R-REP-02 «drafts auto-saved»). */
export const AUTOSAVE_MS = 800;

export function valuesOf(report: ReportView): FormValues {
  return {
    attendance: report.attendance,
    program: report.program,
    recited: report.recited ?? '',
    newMemorization: report.new_memorization ?? '',
    revision: report.revision ?? '',
    theory: report.theory ?? '',
    grades: { ...report.grades },
    overall: report.grade_overall,
    notes: report.notes ?? '',
    homework: report.homework ?? '',
    nextPlan: report.next_plan ?? '',
  };
}

/** The whole form as a draft (autosave sends everything; the server trims, '' clears). */
export function draftBody(v: FormValues): DraftBody {
  const grades = Object.fromEntries(REPORT_RUBRICS.map((r) => [r, v.grades[r]])) as Record<Rubric, Grade | null>;
  return {
    attendance: v.attendance,
    ...(v.program ? { program: v.program } : {}),
    recited: v.recited,
    newMemorization: v.newMemorization,
    revision: v.revision,
    theory: v.theory,
    grades,
    overall: v.overall,
    notes: v.notes,
    homework: v.homework,
    nextPlan: v.nextPlan,
  };
}

export function submitBody(v: FormValues, expectedVersion: number): SubmitBody {
  return { ...draftBody(v), expectedVersion };
}

/**
 * Same rules as the API (reportSubmitSchema): attendance first (`missing_attendance`), then the
 * six grades + overall when the student attended (`missing_grades`), then the required text
 * (`missing_text`); then the program (`missing_program`, the form's «البرنامج *»). null = ready to send.
 */
export function submitProblem(v: FormValues, version = 0): string | null {
  const parsed = reportSubmitSchema.safeParse(submitBody(v, version));
  if (!parsed.success) return parsed.error.issues[0]?.message ?? 'validation_failed';
  return v.program === null ? 'missing_program' : null;
}

/**
 * Autosave: save when the settled form differs from what the server has, nothing is in flight,
 * and this exact body did not just fail (it is retried once the teacher changes something).
 */
export function shouldSave(s: { enabled: boolean; settled: string; saved: string; failed: string | null; pending: boolean }): boolean {
  return s.enabled && !s.pending && s.settled !== s.saved && s.settled !== s.failed;
}
