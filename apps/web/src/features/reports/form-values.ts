import {
  REPORT_RUBRICS,
  reportSubmitSchema,
  type Attendance,
  type Grade,
  type ReportView,
  type Rubric,
} from '@ab/shared';
import type { DraftBody, SubmitBody } from './api';

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
  return {
    attendance: v.attendance,
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
 * six grades + overall when the student attended (`missing_grades`). null = ready to send.
 */
export function submitProblem(v: FormValues): string | null {
  const parsed = reportSubmitSchema.safeParse(submitBody(v, 0));
  return parsed.success ? null : (parsed.error.issues[0]?.message ?? 'validation_failed');
}
