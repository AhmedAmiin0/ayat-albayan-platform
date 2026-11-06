import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';
import { ownershipOf } from '@/modules/sales/sales';
import type { PageFacts, PageKey, PageReportRow } from './report-page.types';

const REPORT =
  'id, public_id, lesson_id, student_id, teacher_id, status, version, form_version, attendance, program, recited, new_memorization, revision, theory, grade_recitation, grade_memorization, grade_revision, grade_tajweed, grade_engagement, grade_commitment, grade_overall, notes, homework, next_plan, content, submitted_at, edited_at, pdf_status, pdf_path, attachments:report_attachments(id, storage_path, mime, size, created_at)' as const;

/**
 * The live page's reads (service role; ReportReaders decides who sees what). Separate reads, not
 * one embed: lesson_reports reaches students only through the composite FK to lesson_students.
 */
@Injectable()
export class ReportPageRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** A SUBMITTED report by its public id or its uuid; null for a draft or an unknown key. */
  async report(key: PageKey): Promise<PageReportRow | null> {
    const column = key.by === 'public' ? 'public_id' : 'id';
    const { data, error } = await this.db
      .from('lesson_reports')
      .select(REPORT)
      .eq(column, key.value)
      .eq('status', 'submitted')
      .maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** The lesson, the student (with the family's accounts) and the teacher of a report. */
  async facts(
    row: Pick<PageReportRow, 'lesson_id' | 'student_id' | 'teacher_id'>,
  ): Promise<PageFacts | null> {
    const [lesson, student, teacher] = await Promise.all([
      this.db.from('lessons').select('starts_at, ends_at').eq('id', row.lesson_id).maybeSingle(),
      this.db
        .from('students')
        .select('name, code, tz, profile_id, guardian:guardians(id, profile_id)')
        .eq('id', row.student_id)
        .maybeSingle(),
      this.db
        .from('teachers')
        .select('display_name_ar, profile_id')
        .eq('id', row.teacher_id)
        .maybeSingle(),
    ]);
    for (const res of [lesson, student, teacher]) if (res.error) throw dbError(res.error);
    if (!lesson.data || !student.data || !teacher.data) return null;
    return { lesson: lesson.data, student: student.data, teacher: teacher.data };
  }

  /** Whether the student is one an assistant owns (SalesRepo.ownership: her leads and brought). */
  async owns(profileId: string, studentId: string): Promise<boolean> {
    return (await ownershipOf(this.db, profileId)).studentIds.includes(studentId);
  }
}
