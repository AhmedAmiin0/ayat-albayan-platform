import { lessonClock, type LessonClock } from '@ab/client-core';
import type { PortalLesson } from '@ab/shared';

/**
 * A later lesson's row (boards PortalWebHome «الحلقات القادمة»): no «يُتاح الدخول بعد …» timer
 * days ahead, since the row already says «يُتاح الدخول من …» under it; the timer shows once the
 * way in is open (to the start) and while the lesson runs.
 */
const ROW_TIMER: Readonly<Record<LessonClock['kind'], boolean>> = {
  opensIn: false,
  startsIn: true,
  now: true,
};

export const rowShowsTimer = (lesson: PortalLesson, now: Date): boolean => {
  const clock = lessonClock(lesson, now);
  return clock ? ROW_TIMER[clock.kind] : false;
};
