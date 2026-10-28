import { juzProgress, type Attendance, type Grade, type JuzProgress, type Program, type ReportContent } from '@ab/shared';
import { packageSlot, type PackageSlot, type PdfContact } from '../render/pdf-model';
import type { ReportSource } from '../report-pdf.source';

/**
 * What the v2 family report shows (docs/design/report-form/ParentReport.dc.html): done today with
 * a grade each, the overall grade, juz progress, homework, the teacher's note, next lesson and the
 * lessons left. Read from the DB, never typed.
 */
export interface FamilyModel {
  student: { name: string; code: string };
  teacherName: string;
  program: Program;
  startsAt: Date;
  /** The guardian's zone, as the v1 report and the report_ready message. */
  tz: string;
  lessonNo: number;
  slot: PackageSlot | null;
  attendance: Attendance;
  content: ReportContent;
  overall: Grade | null;
  notes: string | null;
  homework: string | null;
  nextPlan: string | null;
  nextLessonAt: Date | null;
  progress: JuzProgress | null;
  generatedAt: Date;
  contact?: PdfContact;
}

/** DB rows → the v2 family report. Throws on a report without attendance or without its v2 reads. */
export function toFamilyModel(source: ReportSource, now: Date): FamilyModel {
  const { report, family } = source;
  if (report.attendance === null) throw new Error('report has no attendance');
  if (!family) throw new Error('v2 report without its family reads');
  const program = report.program ?? source.student.program;
  return {
    student: { name: source.student.name, code: source.student.code },
    teacherName: source.teacher.display_name_ar,
    program,
    startsAt: new Date(source.lesson.starts_at),
    tz: source.guardian.tz,
    lessonNo: source.seq ?? source.completedBefore + 1,
    slot: packageSlot(source.packageN, source.packages),
    attendance: report.attendance,
    content: family.content,
    overall: report.grade_overall,
    notes: report.notes,
    homework: report.homework,
    nextPlan: report.next_plan,
    nextLessonAt: family.nextLessonAt === null ? null : new Date(family.nextLessonAt),
    progress: program === 'quran' ? juzProgress(family.content, family.history) : null,
    generatedAt: now,
  };
}
