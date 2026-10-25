import type { AssistantLessonView } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../common/db/db.module';
import { dbError } from '../../../common/http/http';
import type { LessonRef } from './assistants.queries';

/** Lesson rows of an assistant's students between two instants, with the names (service role). */
@Injectable()
export class AssistantLessonsQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async between(refs: LessonRef[], range: { from: string; to: string }): Promise<AssistantLessonView[]> {
    const ids = [...new Set(refs.map((r) => r.lesson_id))];
    if (!ids.length) return [];
    const { data: lessons, error } = await this.db
      .from('lessons')
      .select('id, teacher_id, starts_at, ends_at, status')
      .in('id', ids)
      .gte('starts_at', range.from)
      .lt('starts_at', range.to)
      .order('starts_at');
    if (error) throw dbError(error);
    const [teachers, students] = await Promise.all([
      this.db.from('teachers').select('id, display_name_ar').in('id', [...new Set(lessons.map((l) => l.teacher_id))]),
      this.db.from('students').select('id, name').in('id', [...new Set(refs.map((r) => r.student_id))]),
    ]);
    if (teachers.error) throw dbError(teachers.error);
    if (students.error) throw dbError(students.error);
    const teacherName = new Map(teachers.data.map((t) => [t.id, t.display_name_ar]));
    const studentName = new Map(students.data.map((s) => [s.id, s.name]));
    return lessons.map((l) => ({
      lesson_id: l.id,
      starts_at: l.starts_at,
      ends_at: l.ends_at,
      status: l.status,
      teacher_name: teacherName.get(l.teacher_id) ?? '',
      student_names: refs.filter((r) => r.lesson_id === l.id).map((r) => studentName.get(r.student_id) ?? ''),
    }));
  }
}
