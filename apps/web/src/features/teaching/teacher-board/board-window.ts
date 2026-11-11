import { addDays, BOARD_DAYS, wallInstant, weekWindowIn, type LessonView } from '@ab/shared';
import type { Window } from '@/features/teaching/schedule';

// docs/46 D4: the board reads ONE window of the teacher's lessons, 14 days back and 14 ahead, in
// one zone (the teacher's own) for the whole home: «اليوم» and «الأسبوع» filter the same rows.

/** [today − 14 days, today + 14 days) at local midnights in `tz` (28 days: one API call). */
export function boardWindow(today: string, tz: string): Window {
  return {
    from: wallInstant(addDays(today, -BOARD_DAYS), '00:00', tz),
    to: wallInstant(addDays(today, BOARD_DAYS), '00:00', tz),
  };
}

const inside = (lesson: LessonView, w: Window): boolean => {
  const at = Date.parse(lesson.starts_at);
  return at >= w.from.getTime() && at < w.to.getTime();
};

/** The lessons of the rolling week that starts `today` in `tz` (the «الأسبوع» tab). */
export function weekLessons(
  lessons: readonly LessonView[],
  o: { today: string; tz: string },
): LessonView[] {
  const week = weekWindowIn(o.today, o.tz);
  return lessons.filter((l) => inside(l, week));
}
