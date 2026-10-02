import {
  attended,
  REPORT_RUBRICS,
  reportSubmitSchema,
  type Attendance,
  type Grade,
  type ReportDraft,
  type ReportView,
  type Rubric,
} from '@ab/shared';

// «تقرير الحلقة» values, field for field the web form's (apps/web features/reports/form-values).
// TODO(merge): teacher-mode step 0 moves that file (+ shouldSave, AUTOSAVE_MS) into @ab/shared;
// then import it from there and delete this copy.

/** What the teacher edits (R-REP-02); identity never (R-REP-01). Text fields are '' when empty. */
export interface FormValues {
  attendance: Attendance | null;
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

/** The four «اللي اتعمل في الحلقة» fields, then the three after the grades, in form order. */
export const DONE_FIELDS = ['recited', 'newMemorization', 'revision', 'theory'] as const satisfies readonly TextKey[];
export const AFTER_FIELDS = ['notes', 'homework', 'nextPlan'] as const satisfies readonly TextKey[];

/**
 * Required in the Google Form when the student attended (forms research item 12): التسميع، الحفظ
 * الجديد، المراجعة، ملاحظات المعلمة، الواجب. الدرس النظري and خطة الحلقة القادمة stay optional.
 */
export const REQUIRED_TEXT: readonly TextKey[] = ['recited', 'newMemorization', 'revision', 'notes', 'homework'];

export type DraftBody = Partial<ReportDraft>;
export type SubmitBody = DraftBody & { expectedVersion: number };

/** Typing pause before a draft is saved (R-REP-02 «drafts auto-saved»), as on the web. */
export const AUTOSAVE_MS = 800;

export function valuesOf(report: ReportView): FormValues {
  return {
    attendance: report.attendance,
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
  const { attendance, recited, newMemorization, revision, theory, overall, notes, homework, nextPlan } = v;
  return { attendance, recited, newMemorization, revision, theory, grades, overall, notes, homework, nextPlan };
}

export function submitBody(v: FormValues, expectedVersion: number): SubmitBody {
  return { ...draftBody(v), expectedVersion };
}

/**
 * The API's rules (reportSubmitSchema): attendance first (`missing_attendance`), then the six
 * grades + overall when the student attended (`missing_grades`), then the form's required text
 * (`missing_text`). Absent or excused: nothing else is required. null = ready to send.
 */
export function submitProblem(v: FormValues): string | null {
  const parsed = reportSubmitSchema.safeParse(submitBody(v, 0));
  if (!parsed.success) return parsed.error.issues[0]?.message ?? 'validation_failed';
  if (v.attendance && attended(v.attendance) && REQUIRED_TEXT.some((k) => !v[k].trim())) return 'missing_text';
  return null;
}

/**
 * Save when the settled form differs from what the server has, nothing is in flight, and this
 * exact body did not just fail (it is retried once the teacher changes something).
 */
export function shouldSave(s: { enabled: boolean; settled: string; saved: string; failed: string | null; pending: boolean }): boolean {
  return s.enabled && !s.pending && s.settled !== s.saved && s.settled !== s.failed;
}
