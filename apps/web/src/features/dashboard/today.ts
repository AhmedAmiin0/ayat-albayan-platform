import { isOpenLesson, joinWindow, type LessonView } from '@ab/shared';

/** Today's lessons that still happen (not cancelled/rescheduled), earliest first. */
export function todaysLessons(lessons: LessonView[]): LessonView[] {
  return lessons.filter((l) => isOpenLesson(l.status)).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

/** A lesson whose room can be entered right now (the join window is open). */
export const isLiveNow = (lesson: LessonView, now: Date): boolean => joinWindow(lesson, now).state === 'open';

/** The two «today» numbers of the dashboard's first row; undefined while the day is loading. */
export function todayCounts(lessons: LessonView[] | undefined, now: Date): { lessons: number; live: number } | undefined {
  if (!lessons) return undefined;
  const open = todaysLessons(lessons);
  return { lessons: open.length, live: open.filter((l) => isLiveNow(l, now)).length };
}
