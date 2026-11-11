import { teacherConfirmed } from '@ab/client-core';
import type { LessonView } from '@ab/shared';
import { StatusChip } from '@/components/ui/display/status-chip';
import { t } from '@/lib/i18n/i18n';

type ConfirmedLesson = Pick<LessonView, 'status' | 'starts_at' | 'teacher_confirmed_at'>;

/**
 * «أكّد المعلم الحضور» on the admin's lesson view (docs/46 C4, D1): the teacher said «سأحضر».
 * Apart from the status chip: it never changes the lesson status. Cleared when the lesson moves.
 */
export function TeacherConfirmedTag({ lesson }: { lesson: ConfirmedLesson }) {
  if (!teacherConfirmed(lesson)) return null;
  return <StatusChip tone="ok" glyph="fill" size="sm" label={t.teacherBoard.teacherConfirmed} />;
}
