import { teacherConfirmed } from '@ab/client-core';
import type { LessonView } from '@ab/schedule';
import { StatusChip, t } from '@ab/web-kit';

type ConfirmedLesson = Pick<LessonView, 'status' | 'starts_at' | 'teacher_confirmed_at'>;

/** Separate from the status chip, never changes the status (docs/46 C4, D1); cleared on move. */
export function TeacherConfirmedTag({ lesson }: { lesson: ConfirmedLesson }) {
  if (!teacherConfirmed(lesson)) return null;
  return <StatusChip tone="ok" glyph="fill" size="sm" label={t.teacherBoard.teacherConfirmed} />;
}
