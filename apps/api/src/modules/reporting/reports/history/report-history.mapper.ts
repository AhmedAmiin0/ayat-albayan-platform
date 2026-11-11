import {
  canEditReport,
  editUntil,
  gradeScore,
  REPORT_RUBRICS,
  RUBRIC_COLUMN,
  type GradePoint,
  type PendingReportView,
  type ReportSummaryView,
  type Rubric,
  type UserRole,
  type StudentReportsResponse,
} from '@ab/shared';
import type { PageQuery } from '@/common/http/http';
import type { HistoryLesson, HistoryRow, PendingRow } from './report-history.queries';
import { iso } from '@/modules/reporting/reports/submit/report-form.mapper';

type HistoryParts = {
  rows: readonly HistoryRow[];
  lessons: readonly HistoryLesson[];
  /** lesson_id → «رقم الحلقة» (v_lesson_sequence). */
  seq: ReadonlyMap<string, number>;
  page: PageQuery;
  /** The reader, now and settings.report_teacher_edit_minutes (docs/46 B7); none for sales. */
  window?: SummaryWindow;
};

export type SummaryWindow = { role: UserRole | null; now: Date; minutes: number };

type Joined = { row: HistoryRow; lesson: HistoryLesson; at: number };

/**
 * R5 (R-REP-05, issue D2): submitted reports newest lesson first, one page of them, and the grade
 * series of all of them oldest first (gradeScore: 5 = ممتاز … 1).
 */
export function historyResponse(p: HistoryParts): StudentReportsResponse {
  const byId = new Map(p.lessons.map((l) => [l.id, l]));
  const joined: Joined[] = p.rows
    .flatMap((row) => {
      const lesson = byId.get(row.lesson_id);
      return lesson ? [{ row, lesson, at: Date.parse(lesson.starts_at) }] : [];
    })
    .sort((a, b) => a.at - b.at || a.row.id.localeCompare(b.row.id));
  const start = (p.page.page - 1) * p.page.pageSize;
  const items = [...joined]
    .reverse()
    .slice(start, start + p.page.pageSize)
    .map((j) => ({ ...summary(j, p.seq), ...editWindow(j.row, p.window) }));
  return { items, total: joined.length, page: p.page.page, pageSize: p.page.pageSize, series: joined.map(point) };
}

function summary({ row, lesson }: Joined, seq: ReadonlyMap<string, number>): ReportSummaryView {
  return {
    id: row.id,
    lesson_id: row.lesson_id,
    starts_at: iso(lesson.starts_at),
    lesson_no: seq.get(row.lesson_id) ?? null,
    teacher: lesson.teacher ?? { id: row.teacher_id, display_name_ar: '' },
    attendance: row.attendance,
    grade_overall: row.grade_overall,
    status: row.status,
    version: row.version,
    pdf_status: row.pdf_status,
    sent_at: row.sent_at,
  };
}

/** can_edit / edit_until for the reader (R-REP-02, docs/46 B7); nothing without a window. */
function editWindow(row: HistoryRow, w: SummaryWindow | undefined): Partial<ReportSummaryView> {
  // A fake row may leave the column out: read it as never submitted, not an invalid date.
  const submittedAt = row.submitted_at ? new Date(row.submitted_at) : null;
  const base = { submitted_at: submittedAt?.toISOString() ?? null };
  if (!w) return base;
  const until = editUntil({ submittedAt, minutes: w.minutes });
  const canEdit = w.role !== null && canEditReport({ role: w.role, submittedAt, now: w.now, minutes: w.minutes });
  return { ...base, can_edit: canEdit, edit_until: until?.toISOString() ?? null };
}

function point({ row, lesson }: Joined): GradePoint {
  const rubrics = Object.fromEntries(REPORT_RUBRICS.map((r) => [r, gradeScore(row[RUBRIC_COLUMN[r]])])) as Record<
    Rubric,
    number | null
  >;
  return {
    report_id: row.id,
    lesson_id: row.lesson_id,
    starts_at: iso(lesson.starts_at),
    overall: gradeScore(row.grade_overall),
    rubrics,
  };
}

/** R11: (lesson, student) pairs without a submitted report, oldest lesson first. */
export function pendingViews(rows: readonly PendingRow[]): PendingReportView[] {
  return rows
    .filter((r) => r.lesson_reports?.status !== 'submitted')
    .map((r) => ({
      lesson_id: r.lesson_id,
      starts_at: iso(r.lessons.starts_at),
      status: r.lessons.status,
      student: { id: r.student?.id ?? '', code: r.student?.code ?? '', name: r.student?.name ?? '' },
      report_id: r.lesson_reports?.id ?? null,
    }))
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at) || a.student.name.localeCompare(b.student.name, 'ar'));
}
