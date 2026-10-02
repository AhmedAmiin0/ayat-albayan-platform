import { RIYADH_TZ, type ThreadLesson, type ThreadView } from '@ab/shared';
import type { Db } from '../../common/db/db.module';

/** How many upcoming lessons the template composer offers. */
const LIMIT = 10;
const OPEN = ['scheduled', 'confirmed'] as const;

interface LessonRow {
  id: string;
  starts_at: string;
  meeting_link: string | null;
  teacher: { tz: string } | null;
  lesson_students: { student: { name: string } | null }[];
}

const toLesson = (row: LessonRow, tz: string): ThreadLesson => ({
  id: row.id,
  starts_at: row.starts_at,
  meeting_link: row.meeting_link,
  student_names: row.lesson_students.flatMap((ls) => (ls.student ? [ls.student.name] : [])),
  tz,
});

async function read(db: Db, by: { select: string; column: string; id: string; now: Date }): Promise<LessonRow[]> {
  const { data, error } = await db
    .from('lessons')
    .select(by.select)
    .eq(by.column, by.id)
    .in('status', [...OPEN])
    .gt('starts_at', by.now.toISOString())
    .order('starts_at')
    .limit(LIMIT)
    .overrideTypes<LessonRow[], { merge: false }>();
  if (error) throw new Error(`thread lessons read failed: ${error.message}`);
  return data;
}

const GUARDIAN_SELECT =
  'id, starts_at, meeting_link, teacher:teachers(tz), lesson_students!inner(student:students!inner(name, guardian_id))';
const TEACHER_SELECT = 'id, starts_at, meeting_link, teacher:teachers(tz), lesson_students(student:students(name))';

/**
 * The thread's next open lessons (scheduled | confirmed, not started), for the template composer:
 * a guardian's (only their children named, their tz) or a teacher's (their tz). Rule 6: a
 * template's lesson time is picked from these, never typed.
 */
export async function upcomingLessons(db: Db, at: { thread: ThreadView; now: Date }): Promise<ThreadLesson[]> {
  const { thread, now } = at;
  if (thread.guardian_id) {
    const by = { select: GUARDIAN_SELECT, column: 'lesson_students.student.guardian_id', id: thread.guardian_id, now };
    return (await read(db, by)).map((r) => toLesson(r, thread.guardian_tz ?? RIYADH_TZ));
  }
  if (!thread.teacher_id) return [];
  const rows = await read(db, { select: TEACHER_SELECT, column: 'teacher_id', id: thread.teacher_id, now });
  return rows.map((r) => toLesson(r, r.teacher?.tz ?? RIYADH_TZ));
}
