import type { TablesUpdate } from '@ab/db';
import {
  canEditReport,
  editUntil,
  REPORT_RUBRICS,
  RUBRIC_COLUMN,
  type Grade,
  type ReportDraft,
  type ReportView,
  type Rubric,
  type UserRole,
} from '@ab/shared';
import type { ReportRow } from './report-row';
import { v2Fields } from './v2/report-v2.mapper';

/** Who reads the report and when: drives can_edit / edit_until (R-REP-02). */
export type ViewContext = { role: UserRole | null; now: Date; hours: number };

const instant = (iso: string | null) => (iso === null ? null : new Date(iso));

/** lesson_reports row → ReportView (docs/11 §4); attachments oldest first. */
export function reportView(row: ReportRow, ctx: ViewContext): ReportView {
  const submittedAt = instant(row.submitted_at);
  const until = editUntil({ submittedAt, hours: ctx.hours });
  const grades = Object.fromEntries(REPORT_RUBRICS.map((r) => [r, row[RUBRIC_COLUMN[r]]])) as Record<
    Rubric,
    Grade | null
  >;
  return {
    id: row.id,
    lesson_id: row.lesson_id,
    student_id: row.student_id,
    teacher_id: row.teacher_id,
    attendance: row.attendance,
    program: row.program,
    recited: row.recited,
    new_memorization: row.new_memorization,
    revision: row.revision,
    theory: row.theory,
    grades,
    grade_overall: row.grade_overall,
    notes: row.notes,
    homework: row.homework,
    next_plan: row.next_plan,
    status: row.status,
    version: row.version,
    submitted_at: row.submitted_at,
    edited_at: row.edited_at,
    pdf_status: row.pdf_status,
    pdf_error: row.pdf_error,
    sent_at: row.sent_at,
    attachments: [...row.attachments].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    can_edit: ctx.role !== null && canEditReport({ role: ctx.role, submittedAt, now: ctx.now, hours: ctx.hours }),
    edit_until: until?.toISOString() ?? null,
    ...v2Fields(row),
  };
}

type FormColumn =
  | 'attendance'
  | 'program'
  | 'recited'
  | 'new_memorization'
  | 'revision'
  | 'theory'
  | 'grade_recitation'
  | 'grade_memorization'
  | 'grade_revision'
  | 'grade_tajweed'
  | 'grade_engagement'
  | 'grade_commitment'
  | 'grade_overall'
  | 'notes'
  | 'homework'
  | 'next_plan';
/** The lesson_reports columns the forms write (content: v2 only); identity and state are never client-written. */
export type FormColumns = Pick<TablesUpdate<'lesson_reports'>, FormColumn | 'content'>;

type TextField = 'recited' | 'newMemorization' | 'revision' | 'theory' | 'notes' | 'homework' | 'nextPlan';
const TEXT_COLUMN = {
  recited: 'recited',
  newMemorization: 'new_memorization',
  revision: 'revision',
  theory: 'theory',
  notes: 'notes',
  homework: 'homework',
  nextPlan: 'next_plan',
} as const satisfies Record<TextField, FormColumn>;

/**
 * camelCase form (reportDraftSchema) → columns. Only keys present are written, so an autosave of
 * one field never clears the others; null clears (R-REP-02 drafts).
 */
export function formColumns(form: Partial<ReportDraft>): FormColumns {
  const out: FormColumns = {};
  if (form.attendance !== undefined) out.attendance = form.attendance;
  if (form.program !== undefined) out.program = form.program;
  for (const key of Object.keys(TEXT_COLUMN) as TextField[]) {
    const value = form[key];
    if (value !== undefined) out[TEXT_COLUMN[key]] = value;
  }
  for (const r of REPORT_RUBRICS) {
    const grade = form.grades?.[r];
    if (grade !== undefined) out[RUBRIC_COLUMN[r]] = grade;
  }
  if (form.overall !== undefined) out.grade_overall = form.overall;
  return out;
}

const EMPTY: Required<{ [K in FormColumn]: null }> = {
  attendance: null,
  // The submit RPC keeps the stored program when this is null (migration 167).
  program: null,
  recited: null,
  new_memorization: null,
  revision: null,
  theory: null,
  grade_recitation: null,
  grade_memorization: null,
  grade_revision: null,
  grade_tajweed: null,
  grade_engagement: null,
  grade_commitment: null,
  grade_overall: null,
  notes: null,
  homework: null,
  next_plan: null,
};

/** A submit sends the whole form: every column is written, a field left out is cleared. */
export function submitColumns(form: ReportDraft): FormColumns {
  return { ...EMPTY, ...formColumns(form) };
}
