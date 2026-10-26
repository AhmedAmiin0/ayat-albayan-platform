import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../common/db/db.module';
import { dbError } from '../../../common/http/http';
import { ratingInserts, ratingPatch, type RatedLesson, type RatingTap } from './rating.rows';

/**
 * Stores a guardian's lesson_rating tap on lesson_feedback (migration 195), one row per child of
 * theirs on the lesson. Idempotent: a replayed wamid never reaches here (the webhook stops it), and
 * a second tap only rewrites the same three columns. The form's own answer is never touched.
 */
@Injectable()
export class RatingStore {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** How many rows now carry the rating (0: the lesson is not this guardian's child's). */
  async record(tap: RatingTap): Promise<number> {
    const lesson = await this.lesson(tap);
    if (!lesson || lesson.studentIds.length === 0) return 0;
    const { data: existing, error } = await this.db
      .from('lesson_feedback')
      .select('student_id')
      .eq('lesson_id', tap.lessonId)
      .in('student_id', lesson.studentIds);
    if (error) throw dbError(error);
    const have = new Set(existing.map((r) => r.student_id));
    const fresh = ratingInserts(tap, { ...lesson, studentIds: lesson.studentIds.filter((id) => !have.has(id)) });
    if (fresh.length > 0) {
      // A concurrent request may have made the row meanwhile: then the update below rates it.
      const ins = await this.db.from('lesson_feedback').upsert(fresh, { onConflict: 'lesson_id,student_id', ignoreDuplicates: true });
      if (ins.error) throw dbError(ins.error);
    }
    const upd = await this.db
      .from('lesson_feedback')
      .update(ratingPatch(tap))
      .eq('lesson_id', tap.lessonId)
      .in('student_id', lesson.studentIds)
      .select('id');
    if (upd.error) throw dbError(upd.error);
    return upd.data.length;
  }

  /** The lesson's teacher, kind (free trial or not) and this guardian's children on it. */
  private async lesson(tap: RatingTap): Promise<RatedLesson | null> {
    const { data, error } = await this.db
      .from('lessons')
      .select('teacher_id, rule:schedule_rules(package), lesson_students(student:students!inner(id, guardian_id))')
      .eq('id', tap.lessonId)
      .maybeSingle();
    if (error) throw dbError(error);
    if (!data) return null;
    const studentIds = data.lesson_students.flatMap((ls) => (ls.student?.guardian_id === tap.guardianId ? [ls.student.id] : []));
    return { teacherId: data.teacher_id, kind: data.rule?.package === 'trial' ? 'trial' : 'subscription', studentIds };
  }
}
