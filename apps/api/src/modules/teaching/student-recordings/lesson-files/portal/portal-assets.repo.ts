import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';

/** A lesson as the family page reads it. */
interface PortalLessonRef {
  id: string;
  starts_at: string;
  ends_at: string;
  teacher: { display_name_ar: string; display_name_en: string | null } | null;
}

const LESSON =
  'id, starts_at, ends_at, teacher:teachers(display_name_ar, display_name_en), lesson_students!inner(student_id)';

/**
 * The family's lesson page (service role, the student already scoped by PortalScopes). «Sent» and
 * the visible recordings are the portal's own reader (PortalReportsRepo): one rule for both pages.
 */
@Injectable()
export class PortalAssetsRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

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
