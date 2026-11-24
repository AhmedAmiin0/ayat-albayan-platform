import { lessonWait, nextLesson } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { useNow } from '@ab/web-kit/lib/time/use-now';
import { portalLessonsQuery } from '@ab/web-kit/portal/api';

/** The countdown ticks every second; the join button turns on by itself at the window. */
const TICK_MS = 1_000;

/**
 * A student's next lesson on the page's own clock (the read the child's pages share): the first
 * one still ahead, `open` while its join window is (the button, not a hint), and the tick's `now`.
 */
export function useNextLesson(studentId: string) {
  const now = useNow(TICK_MS);
  const lessons = useQuery(portalLessonsQuery(studentId));
  const next = lessons.data ? nextLesson(lessons.data.lessons, now) : null;
  return { lessons, next, now, open: next !== null && lessonWait(next, now) === null };
}

export type NextLessonRead = ReturnType<typeof useNextLesson>;
