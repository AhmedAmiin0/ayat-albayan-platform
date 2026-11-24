import { Inject, Injectable } from '@nestjs/common';
import type { PostgrestError } from '@supabase/supabase-js';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';

type Teacher = { display_name_ar: string; display_name_en: string | null } | null;

/** A sent report (whitelisted select: never the teacher's form fields or notes). */
export interface PortalReportRow {
  id: string;
  lesson_id: string;
  sent_at: string | null;
  pdf_path: string | null;
  lesson: { starts_at: string; teacher: Teacher } | null;
}

/** A recording the family may play, with what its list and lesson page show. */
export interface PortalRecordingRow {
  id: string;
  lesson_id: string;
  file_path: string;
  started_at: string;
  ended_at: string | null;
  size_bytes: number | null;
  lesson: { starts_at: string; teacher: Teacher };
}

/** A sent report of a lesson: which one, nothing of its content. */
interface SentRef {
  id: string;
  lesson_id: string;
}

export interface ReportTexts {
  homework: string | null;
  next_plan: string | null;
}

const LIMIT = 60;
/** Old enough families are not cut at the list's page: an old recording still opens. */
const SCAN = 1000;
const REC = 'id, lesson_id, file_path, started_at, ended_at, size_bytes, lessons!inner(starts_at, teacher:teachers(display_name_ar, display_name_en), lesson_students(student_id))';
type Reply<T> = PromiseLike<{ data: T | null; error: PostgrestError | null }>;

/** Sent means submitted, PDF ready and report_ready delivered: the PDFs the family received. */
@Injectable()
export class PortalReportsRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async sent(studentId: string, limit = LIMIT): Promise<PortalReportRow[]> {
    const { data, error } = await this.sentQuery(studentId)
      .order('sent_at', { ascending: false })
      .limit(limit);
    if (error) throw dbError(error);
    return this.withLessons(data);
  }

  /** lesson_id → report id of every sent report (no lesson read). */
  async sentLessons(studentId: string): Promise<Map<string, string>> {
    const data = await rows(this.sentQuery(studentId).order('sent_at', { ascending: false })
      .limit(SCAN));
    return new Map(data.map((r) => [r.lesson_id, r.id]));
  }

  async oneSent(
    input: { studentId: string; reportId: string },
  ): Promise<Omit<PortalReportRow, 'lesson'> | null> {
    const { data, error } = await this.sentQuery(input.studentId).eq('id', input.reportId)
      .maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** The sent reports of these lessons (the history's report_id). */
  async sentOf(input: { studentId: string; lessonIds: readonly string[] }): Promise<SentRef[]> {
    if (input.lessonIds.length === 0) return [];
    const data = await rows(this.sentQuery(input.studentId).in('lesson_id', [...input.lessonIds]));
    return data.map((r) => ({ id: r.id, lesson_id: r.lesson_id }));
  }

  /** docs/50 §2: texts of a report the sent rule already picked. */
  async texts(reportId: string): Promise<ReportTexts | null> {
    const { data, error } = await this.db
      .from('lesson_reports')
      .select('homework, next_plan')
      .eq('id', reportId)
      .maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /**
   * Finished recordings of these lessons that staff made visible to the student
   * (visible_to_student, default off), newest first, on one-student lessons only: a group file
   * is every student's session.
   */
  async visibleRecordings(lessonIds: readonly string[]): Promise<PortalRecordingRow[]> {
    if (lessonIds.length === 0) return [];
    const data = await rows(this.db
      .from('lesson_recordings')
      .select(REC)
      .in('lesson_id', [...lessonIds])
      .eq('visible_to_student', true)
      .eq('status', 'done')
      .order('started_at', { ascending: false }));
    return data.flatMap(({ lessons, lesson_id, ...r }) =>
      lesson_id && lessons.lesson_students.length === 1
        ? [{ ...r, lesson_id, lesson: { starts_at: lessons.starts_at, teacher: lessons.teacher } }]
        : []);
  }

  /** lesson_reports reaches lessons only through lesson_students (composite key): 2nd read. */
  private async withLessons(
    sent: readonly Omit<PortalReportRow, 'lesson'>[],
  ): Promise<PortalReportRow[]> {
    if (sent.length === 0) return [];
    const data = await rows(this.db
      .from('lessons')
      .select('id, starts_at, teacher:teachers(display_name_ar, display_name_en)')
      .in('id', [...new Set(sent.map((r) => r.lesson_id))]));
    const byId = new Map(data.map((l) => [l.id, { starts_at: l.starts_at, teacher: l.teacher }]));
    return sent.map((r) => ({ ...r, lesson: byId.get(r.lesson_id) ?? null }));
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

/** The rows of a list read; a database error throws. */
async function rows<T>(query: Reply<T[]>): Promise<T[]> {
  const { data, error } = await query;
  if (error) throw dbError(error);
  return data ?? [];
}
