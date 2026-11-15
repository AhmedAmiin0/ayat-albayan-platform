import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';

/** A sent report (whitelisted select: never the teacher's form fields or notes). */
export interface PortalReportRow {
  id: string;
  lesson_id: string;
  sent_at: string | null;
  pdf_path: string | null;
  lesson: { starts_at: string; teacher: { display_name_ar: string; display_name_en: string | null } | null } | null;
}

/** A recording the family may see, with the facts that decide it. */
export interface PortalRecordingRow {
  id: string;
  lesson_id: string;
  file_path: string;
}

/** A sent report of a lesson: which one, nothing of its content. */
interface SentRef {
  id: string;
  lesson_id: string;
}

/** The two texts the family prepares from («الواجب», «خطة الحلقة القادمة»). */
export interface ReportTexts {
  homework: string | null;
  next_plan: string | null;
}

const LIMIT = 60;

/**
 * «تقارير الحلقات» reads (service role, the student already scoped). Sent = submitted, the PDF ready and
 * the report_ready message gone (sent_at): the same PDFs the family received on WhatsApp.
 */
@Injectable()
export class PortalReportsRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** The newest sent reports first (`limit` 1: the one «ما المطلوب» reads). */
  async sent(studentId: string, limit = LIMIT): Promise<PortalReportRow[]> {
    const { data, error } = await this.sentQuery(studentId)
      .order('sent_at', { ascending: false })
      .limit(limit);
    if (error) throw dbError(error);
    return this.withLessons(data);
  }

  async oneSent(input: { studentId: string; reportId: string }): Promise<Omit<PortalReportRow, 'lesson'> | null> {
    const { data, error } = await this.sentQuery(input.studentId).eq('id', input.reportId).maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** The sent reports of these lessons (the history's report_id). */
  async sentOf(input: { studentId: string; lessonIds: readonly string[] }): Promise<SentRef[]> {
    if (input.lessonIds.length === 0) return [];
    const { data, error } = await this.sentQuery(input.studentId)
      .in('lesson_id', [...input.lessonIds]);
    if (error) throw dbError(error);
    return data.map((r) => ({ id: r.id, lesson_id: r.lesson_id }));
  }

  /** «ما المطلوب» (docs/50 §2): the texts of a report the sent rule already picked. */
  async texts(reportId: string): Promise<ReportTexts | null> {
    const { data, error } = await this.db
      .from('lesson_reports')
      .select('homework, next_plan')
      .eq('id', reportId)
      .maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** lesson_reports reaches lessons only through lesson_students (composite key): a second read. */
  private async withLessons(rows: readonly Omit<PortalReportRow, 'lesson'>[]): Promise<PortalReportRow[]> {
    if (rows.length === 0) return [];
    const { data, error } = await this.db
      .from('lessons')
      .select('id, starts_at, teacher:teachers(display_name_ar, display_name_en)')
      .in('id', [...new Set(rows.map((r) => r.lesson_id))]);
    if (error) throw dbError(error);
    const byId = new Map(data.map((l) => [l.id, { starts_at: l.starts_at, teacher: l.teacher }]));
    return rows.map((r) => ({ ...r, lesson: byId.get(r.lesson_id) ?? null }));
  }

  /**
   * Finished recordings of these lessons that staff made visible to the student (visible_to_student,
   * default off), on one-student lessons only: a group file is every student's session.
   */
  async visibleRecordings(lessonIds: readonly string[]): Promise<PortalRecordingRow[]> {
    if (lessonIds.length === 0) return [];
    const { data, error } = await this.db
      .from('lesson_recordings')
      .select('id, lesson_id, file_path, lessons!inner(lesson_students(student_id))')
      .in('lesson_id', [...lessonIds])
      .eq('visible_to_student', true)
      .eq('status', 'done')
      .order('started_at', { ascending: false });
    if (error) throw dbError(error);
    return data.flatMap((r) => (r.lesson_id && r.lessons.lesson_students.length === 1 ? [{ id: r.id, lesson_id: r.lesson_id, file_path: r.file_path }] : []));
  }

  private sentQuery(studentId: string) {
    return this.db
      .from('lesson_reports')
      .select('id, lesson_id, sent_at, pdf_path')
      .eq('student_id', studentId)
      .eq('status', 'submitted')
      .eq('pdf_status', 'ready')
      .not('sent_at', 'is', null);
  }
}
