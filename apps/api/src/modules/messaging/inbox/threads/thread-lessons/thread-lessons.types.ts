import type { ThreadView } from '@ab/shared';
import type { LessonStatus } from '@ab/catalog';

export interface LessonRow {
  id: string;
  starts_at: string;
  ends_at: string;
  status: LessonStatus;
  meeting_link: string | null;
  teacher: { tz: string } | null;
  lesson_students: { student: { name: string } | null }[];
}

/** What the lessons are looked up by: a thread, or a number with no message yet (KnownNumber). */
export type LessonsOf = Pick<ThreadView, 'guardian_id' | 'guardian_tz' | 'teacher_id'>;
