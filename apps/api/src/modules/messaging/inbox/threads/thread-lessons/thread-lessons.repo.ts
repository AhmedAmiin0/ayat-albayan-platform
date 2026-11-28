import type { ThreadLesson } from '@ab/shared';
import { RIYADH_TZ } from '@ab/time';
import type { Db } from '@/common/db/db.module';
import { toLesson } from './thread-lessons';
import type { LessonRow, LessonsOf } from './thread-lessons.types';
import { check } from '@/modules/messaging/inbox/threads/store/check';

/** How many upcoming lessons the template composer offers. */
const LIMIT = 10;
const OPEN = ['scheduled', 'confirmed'] as const;

interface ReadBy {
  select: string;
  column: string;
  id: string;
  now: Date;
  teacherId?: string | undefined;
}

async function read(db: Db, by: ReadBy): Promise<LessonRow[]> {
  let query = db.from('lessons').select(by.select).eq(by.column, by.id);
  if (by.teacherId) query = query.eq('teacher_id', by.teacherId);
  const { data, error } = await query
    .in('status', [...OPEN])
    .gt('starts_at', by.now.toISOString())
    .order('starts_at')
    .limit(LIMIT)
    .overrideTypes<LessonRow[], { merge: false }>();
  check(error, 'thread lessons read');
  return data;
}

const GUARDIAN_SELECT =
  'id, starts_at, ends_at, status, meeting_link, teacher:teachers(tz), lesson_students!inner(student:students!inner(name, guardian_id))';
const TEACHER_SELECT =
  'id, starts_at, ends_at, status, meeting_link, teacher:teachers(tz), lesson_students(student:students(name))';
const BY_GUARDIAN = 'lesson_students.student.guardian_id';

/** Rule 6: a template's lesson time is picked from these, never typed. */
export async function upcomingLessons(
  db: Db,
  at: { thread: LessonsOf; now: Date; teacherId?: string | undefined },
): Promise<ThreadLesson[]> {
  const { thread, now, teacherId } = at;
  if (thread.guardian_id) {
    const id = thread.guardian_id;
    const by = { select: GUARDIAN_SELECT, column: BY_GUARDIAN, id, now, teacherId };
    return (await read(db, by)).map((r) => toLesson(r, thread.guardian_tz ?? RIYADH_TZ));
  }
  if (!thread.teacher_id) return [];
  const id = thread.teacher_id;
  const by = { select: TEACHER_SELECT, column: 'teacher_id', id, now, teacherId };
  return (await read(db, by)).map((r) => toLesson(r, r.teacher?.tz ?? RIYADH_TZ));
}
