import { REPORT_RUBRICS, RUBRIC_COLUMN, type Grade, type Rubric } from '@ab/shared';
import { packageSlot, type ReportPdfModel } from './pdf-model';
import type { ReportSource } from './report-pdf.source';
import { reportReadyMessage, type ReportReadyMessage } from './report-ready';

/** DB rows → what the template draws. Throws on a report without attendance (never submitted). */
export function toModel(source: ReportSource, now: Date): ReportPdfModel {
  const { report, student, guardian } = source;
  if (report.attendance === null) throw new Error('report has no attendance');
  const grades = Object.fromEntries(
    REPORT_RUBRICS.map((rubric) => [rubric, report[RUBRIC_COLUMN[rubric]]]),
  ) as Record<Rubric, Grade | null>;
  return {
    student: { name: student.name, code: student.code },
    teacherName: source.teacher.display_name_ar,
    program: report.program ?? student.program,
    startsAt: new Date(source.lesson.starts_at),
    endsAt: new Date(source.lesson.ends_at),
    tz: guardian.tz,
    lessonNo: source.seq ?? source.completedBefore + 1,
    slot: packageSlot(source.packageN, source.packages),
    attendance: report.attendance,
    recited: report.recited,
    newMemorization: report.new_memorization,
    revision: report.revision,
    theory: report.theory,
    grades,
    overall: report.grade_overall,
    notes: report.notes,
    homework: report.homework,
    nextPlan: report.next_plan,
    generatedAt: now,
  };
}

/** The report_ready message for the PDF stored at `pdfPath`. */
export function toMessage(source: ReportSource, pdfPath: string, now: Date): ReportReadyMessage {
  return reportReadyMessage(
    {
      reportId: source.report.id,
      lessonId: source.report.lesson_id,
      studentName: source.student.name,
      studentCode: source.student.code,
      startsAt: new Date(source.lesson.starts_at),
      guardian: source.guardian,
      pdfPath,
      trial: source.lesson.trial === true,
    },
    now,
  );
}
