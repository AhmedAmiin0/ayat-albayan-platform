import type { Attendance, Grade, LessonStatus, PdfStatus, ReportStatus } from '@ab/catalog';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { readAll, readChunked } from '@/common/db/read-all';
import { maybe, pgError } from '@/common/db/errors';

const HISTORY_COLUMNS =
  'id, lesson_id, teacher_id, attendance, grade_recitation, grade_memorization, grade_revision, grade_tajweed, grade_engagement, grade_commitment, grade_overall, status, version, pdf_status, sent_at, submitted_at' as const;

export interface HistoryRow {
  id: string;
  lesson_id: string;
  teacher_id: string;
  attendance: Attendance | null;
  grade_recitation: Grade | null;
  grade_memorization: Grade | null;
  grade_revision: Grade | null;
  grade_tajweed: Grade | null;
  grade_engagement: Grade | null;
  grade_commitment: Grade | null;
  grade_overall: Grade | null;
  status: ReportStatus;
  version: number;
  pdf_status: PdfStatus | null;
  sent_at: string | null;
  submitted_at: string | null;
}

export interface HistoryLesson {
  id: string;
  starts_at: string;
  teacher: { id: string; display_name_ar: string } | null;
}

/** Lessons a report is still owed for: started, not cancelled or moved (docs/11 §4 R11). */
export const REPORTABLE_STATUSES = ['scheduled', 'confirmed', 'completed', 'late', 'no_show', 'excused'] as const;

export interface PendingRow {
  lesson_id: string;
  student: { id: string; code: string | null; name: string } | null;
  lessons: { starts_at: string; status: LessonStatus };
  lesson_reports: { id: string; status: ReportStatus } | null;
}

/** Report history (R5, R-REP-05) and pending reports (R11, R-TCH-03). Service role; callers guard. */
@Injectable()
export class ReportHistoryQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Every submitted report of the student (a few hundred at most; R-NFR-08 via readAll ranges). */
  submitted(studentId: string): Promise<HistoryRow[]> {
    return readAll((from, to) =>
      this.db
        .from('lesson_reports')
        .select(HISTORY_COLUMNS)
        .eq('student_id', studentId)
        .eq('status', 'submitted')
        .order('id')
        .range(from, to),
    );
  }

  async lessons(ids: readonly string[]): Promise<HistoryLesson[]> {
    return readChunked(ids, (chunk) =>
      this.db
        .from('lessons')
        .select('id, starts_at, teacher:teachers(id, display_name_ar, display_name_en)')
        .in('id', chunk),
    );
  }

  /** Completed lessons only (v_lesson_sequence). */
  async sequence(studentId: string): Promise<Map<string, number>> {
    const rows = await readAll((from, to) =>
      this.db.from('v_lesson_sequence').select('lesson_id, seq').eq('student_id', studentId).order('seq').range(from, to),
    );
    return new Map(
      rows.flatMap((r) => (r.lesson_id && r.seq !== null ? [[r.lesson_id, r.seq] as const] : [])),
    );
  }

  /** The student's assigned teacher; null when the student does not exist. */
  async student(id: string): Promise<{ teacher_id: string | null } | null> {
    const data = maybe(await this.db.from('students').select('teacher_id').eq('id', id).maybeSingle());
    return data;
  }

  /** Is the student in the teacher's scope (teacher_has_student: assigned or a lesson ≤ 90 days)? */
  async taught(input: { teacherId: string; studentId: string }): Promise<boolean> {
    const { data, error } = await this.db.rpc('teacher_has_student', {
      p_teacher_id: input.teacherId,
      p_student_id: input.studentId,
    });
    if (error) throw pgError(error);
    return  data;
  }

  /**
   * Every (lesson, student) of the teacher's started, reportable lessons with its report state.
   * ponytail: scans the teacher's whole history; add a lookback window if R-NFR-08 needs it.
   */
  pending(teacherId: string, now: Date): Promise<PendingRow[]> {
    return readAll((from, to) =>
      this.db
        .from('lesson_students')
        .select('lesson_id, student:students(id, code, name), lessons!inner(starts_at, status), lesson_reports(id, status)')
        .eq('lessons.teacher_id', teacherId)
        .lte('lessons.starts_at', now.toISOString())
        .in('lessons.status', [...REPORTABLE_STATUSES])
        .order('lesson_id')
        .order('student_id')
        .range(from, to),
    );
  }
}
