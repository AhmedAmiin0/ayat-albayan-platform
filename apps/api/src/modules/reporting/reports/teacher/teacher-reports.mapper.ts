import { canEditReport, editUntil, type TeacherReportView } from '@ab/shared';
import { iso } from '@/modules/reporting/reports/submit/report-form.mapper';
import type { ReportStudent, TeacherReportRow } from './teacher-reports.queries';

export type TeacherReportParts = {
  /** lesson id → starts_at. */
  lessons: ReadonlyMap<string, string>;
  students: ReadonlyMap<string, ReportStudent>;
  now: Date;
  /** settings.report_teacher_edit_minutes. */
  minutes: number;
};

/** Read-only identity from the lesson and the student; a missing embed degrades to ''. */
function identity(row: TeacherReportRow, p: TeacherReportParts): Pick<TeacherReportView, 'starts_at' | 'student'> {
  const startsAt = p.lessons.get(row.lesson_id);
  const student = p.students.get(row.student_id);
  return {
    starts_at: startsAt ? iso(startsAt) : '',
    student: { id: row.student_id, code: student?.code ?? '', name: student?.name ?? '' },
  };
}

const instantOf = (at: string | null): Date | null => (at === null ? null : new Date(at));

/**
 * One of my submitted reports (R-REP-02): «تعديل التقرير» while canEditReport for the teacher
 * (edit_until = first submit + report_teacher_edit_minutes), else «عرض التقرير».
 */
export function toTeacherReportView(row: TeacherReportRow, p: TeacherReportParts): TeacherReportView {
  const submittedAt = instantOf(row.submitted_at);
  const until = editUntil({ submittedAt, minutes: p.minutes });
  return {
    id: row.id,
    lesson_id: row.lesson_id,
    ...identity(row, p),
    attendance: row.attendance,
    grade_overall: row.grade_overall,
    status: row.status,
    submitted_at: submittedAt?.toISOString() ?? null,
    can_edit: canEditReport({ role: 'teacher', submittedAt, sentAt: instantOf(row.sent_at), now: p.now, minutes: p.minutes }),
    edit_until: until?.toISOString() ?? null,
    pdf_status: row.pdf_status,
    sent_at: row.sent_at,
  };
}
