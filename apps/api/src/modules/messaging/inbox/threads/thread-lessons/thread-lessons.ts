import type { ThreadLesson } from '@ab/shared';
import type { LessonRow } from './thread-lessons.types';

export const toLesson = (row: LessonRow, tz: string): ThreadLesson => ({
  id: row.id,
  starts_at: row.starts_at,
  meeting_link: row.meeting_link,
  student_names: row.lesson_students.flatMap((ls) => (ls.student ? [ls.student.name] : [])),
  tz,
  status: row.status,
  ends_at: row.ends_at,
});
