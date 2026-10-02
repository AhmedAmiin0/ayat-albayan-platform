import { canEditReport, editUntil, type TeacherReportView } from '@ab/shared';
import { iso } from './report-form.mapper';
import type { ReportStudent, TeacherReportRow } from './teacher-reports.queries';

export type TeacherReportParts = {
  /** lesson id → starts_at. */
  lessons: ReadonlyMap<string, string>;
  students: ReadonlyMap<string, ReportStudent>;
  now: Date;
  /** settings.report_teacher_edit_hours. */
  hours: number;
};

/**
 * One of my submitted reports (R-REP-02): «تعديل التقرير» while canEditReport for the teacher
 * (edit_until = first submit + report_teacher_edit_hours), else «عرض التقرير».
 */
export function toTeacherReportView(row: TeacherReportRow, p: TeacherReportParts): TeacherReportView {
  const submittedAt = row.submitted_at === null ? null : new Date(row.submitted_at);
  const until = editUntil({ submittedAt, hours: p.hours });
  const startsAt = p.lessons.get(row.lesson_id);
  const student = p.students.get(row.student_id);
  return {
    id: row.id,
    lesson_id: row.lesson_id,
    starts_at: startsAt ? iso(startsAt) : '',
    student: { id: row.student_id, code: student?.code ?? '', name: student?.name ?? '' },
    attendance: row.attendance,
    grade_overall: row.grade_overall,
    status: row.status,
    submitted_at: submittedAt?.toISOString() ?? null,
    can_edit: canEditReport({ role: 'teacher', submittedAt, now: p.now, hours: p.hours }),
    edit_until: until?.toISOString() ?? null,
    pdf_status: row.pdf_status,
    sent_at: row.sent_at,
  };
}
