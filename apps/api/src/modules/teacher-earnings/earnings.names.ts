import type { Db } from '../../common/db/db.module';
import { dbError } from '../teachers/http';

type Student = { student: { name: string } | null };
type NameRow = { lesson_id: string } & Student;

/** lesson id → the students on it (names for the sessions list). */
export async function lessonNames(db: Db, lessonIds: string[]): Promise<Map<string, Student[]>> {
  const byLesson = new Map<string, Student[]>();
  if (lessonIds.length === 0) return byLesson;
  const { data, error } = await db
    .from('lesson_students')
    .select('lesson_id, student:students(name)')
    .in('lesson_id', lessonIds)
    .returns<NameRow[]>();
  if (error) throw dbError(error);
  for (const r of data) byLesson.set(r.lesson_id, [...(byLesson.get(r.lesson_id) ?? []), { student: r.student }]);
  return byLesson;
}
