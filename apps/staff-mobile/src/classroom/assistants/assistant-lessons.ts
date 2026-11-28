import { LESSON_STATUSES } from '@ab/catalog';
import { isOpenLesson, type AssistantLessonView } from '@ab/schedule';
import type { JoinableLesson } from '@/classroom/links/JoinClassroomButton';

/** An assistant's session entry, or null when cancelled/finished or of an unknown newer status. */
export function joinableOf(l: AssistantLessonView): JoinableLesson | null {
  const status = LESSON_STATUSES.find((s) => s === l.status);
  if (!status || !isOpenLesson(status)) return null;
  return { id: l.lesson_id, status, starts_at: l.starts_at, ends_at: l.ends_at };
}

/** The sessions still open, each with its entry data (cancelled/finished ones left out). */
export function joinableRows(
  list: readonly AssistantLessonView[],
): { view: AssistantLessonView; lesson: JoinableLesson }[] {
  return list.flatMap((view) => {
    const lesson = joinableOf(view);
    return lesson ? [{ view, lesson }] : [];
  });
}
