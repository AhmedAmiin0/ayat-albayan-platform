import type { BalanceView, MemoryView, ReportFormEntry, ReportFormResponse } from '@ab/shared';
import { reportView, type ViewContext } from '../report.mapper';
import type { ReportLessonRow, ReportLessonStudent, ReportRow } from '../report-row';

export const iso = (at: string) => new Date(at).toISOString();

/** code/program are never null in the DB (generated / not null default); the embed types are looser. */
function formStudent(s: ReportLessonStudent): ReportFormEntry['student'] {
  const st = s.student;
  return { id: s.student_id, code: st?.code ?? '', name: st?.name ?? '', tz: st?.tz ?? '', program: st?.program ?? 'quran' };
}

type FormParts = {
  lesson: ReportLessonRow;
  reports: readonly ReportRow[];
  numbers: ReadonlyMap<string, number>;
  packages: ReadonlyMap<string, BalanceView>;
  /** v2 entries only (ReportLessonQueries.memory). */
  memory: ReadonlyMap<string, MemoryView>;
  ctx: ViewContext;
  block: ReportFormResponse['submit_block'];
};

/**
 * GET /lessons/:id/report-form (R-REP-01, issue D1): the read-only identity comes only from the
 * lesson, one entry per student (by name) that has a report row.
 */
export function formResponse(p: FormParts): ReportFormResponse {
  const { lesson } = p;
  const byStudent = new Map(p.reports.map((r) => [r.student_id, r]));
  const entries: ReportFormEntry[] = lesson.lesson_students.flatMap((s) => {
    const report = byStudent.get(s.student_id);
    if (!report) return [];
    return [
      {
        student: formStudent(s),
        lesson_no: p.numbers.get(s.student_id) ?? 1,
        package: p.packages.get(s.student_id) ?? null,
        report: reportView(report, p.ctx),
        ...(report.form_version === 2 ? { memory: p.memory.get(s.student_id) ?? null } : {}),
      },
    ];
  });
  entries.sort((a, b) => a.student.name.localeCompare(b.student.name, 'ar'));
  return {
    lesson: {
      id: lesson.id,
      starts_at: iso(lesson.starts_at),
      ends_at: iso(lesson.ends_at),
      status: lesson.status,
      meeting_link: lesson.meeting_link,
      teacher: lesson.teacher ?? { id: lesson.teacher_id, display_name_ar: '', tz: '' },
    },
    entries,
    submit_block: p.block,
  };
}
