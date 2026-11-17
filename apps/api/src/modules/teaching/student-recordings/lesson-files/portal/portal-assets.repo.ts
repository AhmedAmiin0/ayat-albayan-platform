import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';

type Teacher = { display_name_ar: string; display_name_en: string | null } | null;

/** A lesson as the family page reads it. */
export interface PortalLessonRef {
  id: string;
  starts_at: string;
  ends_at: string;
  teacher: Teacher;
}

/** A recording the family may play, with what the list shows. */
export interface PortalRecordingRow {
  id: string;
  lesson_id: string;
  file_path: string;
  started_at: string;
  ended_at: string | null;
  size_bytes: number | null;
  lesson: { starts_at: string; teacher: Teacher };
}

/** Old enough families are not cut at a page of 60 (the report list's cap). */
const SCAN = 1000;
const REC =
  'id, lesson_id, file_path, started_at, ended_at, size_bytes, lessons!inner(starts_at, teacher:teachers(display_name_ar, display_name_en), lesson_students(student_id))';
const LESSON =
  'id, starts_at, ends_at, teacher:teachers(display_name_ar, display_name_en), lesson_students!inner(student_id)';

/**
 * The family's lesson assets (service role, the student already scoped by PortalScopes). Today's
 * rules: a recording shows once its lesson's report reached the family (sent), staff made it
 * visible, it finished, and the lesson had one student (a group file is every student's session).
 */
@Injectable()
export class PortalAssetsRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** lesson_id → report id of the student's sent reports. */
  async sentReports(studentId: string): Promise<Map<string, string>> {
    const { data, error } = await this.db
      .from('lesson_reports')
      .select('id, lesson_id')
      .eq('student_id', studentId)
      .eq('status', 'submitted')
      .eq('pdf_status', 'ready')
      .not('sent_at', 'is', null)
      .order('sent_at', { ascending: false })
      .limit(SCAN);
    if (error) throw dbError(error);
    return new Map(data.map((r) => [r.lesson_id, r.id]));
  }

  async visibleRecordings(lessonIds: readonly string[]): Promise<PortalRecordingRow[]> {
    if (lessonIds.length === 0) return [];
    const { data, error } = await this.db
      .from('lesson_recordings')
      .select(REC)
      .in('lesson_id', [...lessonIds])
      .eq('visible_to_student', true)
      .eq('status', 'done')
      .order('started_at', { ascending: false });
    if (error) throw dbError(error);
    return data.flatMap(({ lessons, lesson_id, ...r }) =>
      lesson_id && lessons.lesson_students.length === 1
        ? [{ ...r, lesson_id, lesson: { starts_at: lessons.starts_at, teacher: lessons.teacher } }]
        : []);
  }

  /** The lesson when this student attended it; null otherwise (404 for the caller). */
  async lessonOf(input: { studentId: string; lessonId: string }): Promise<PortalLessonRef | null> {
    const { data, error } = await this.db
      .from('lessons')
      .select(LESSON)
      .eq('id', input.lessonId)
      .eq('lesson_students.student_id', input.studentId)
      .maybeSingle();
    if (error) throw dbError(error);
    if (!data) return null;
    return { id: data.id, starts_at: data.starts_at, ends_at: data.ends_at, teacher: data.teacher };
  }
}
