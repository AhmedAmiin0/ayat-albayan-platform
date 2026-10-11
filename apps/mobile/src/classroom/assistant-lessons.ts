import { isOpenLesson, LESSON_STATUSES, type AssistantLessonView } from '@ab/shared';
import type { JoinableLesson } from './JoinClassroomButton';

/** The entry data of an assistant's session, or null when it is cancelled/finished (or an unknown status from a newer API). */
export function joinableOf(l: AssistantLessonView): JoinableLesson | null {
  const status = LESSON_STATUSES.find((s) => s === l.status);
  if (!status || !isOpenLesson(status)) return null;
  return { id: l.lesson_id, status, starts_at: l.starts_at, ends_at: l.ends_at };
}

/** The sessions still open, each with its entry data (cancelled/finished ones left out). */
export function joinableRows(list: readonly AssistantLessonView[]): { view: AssistantLessonView; lesson: JoinableLesson }[] {
  return list.flatMap((view) => {
    const lesson = joinableOf(view);
    return lesson ? [{ view, lesson }] : [];
  });
}
