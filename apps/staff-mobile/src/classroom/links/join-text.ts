import { t } from '@ab/mobile-kit';
import type { ClockCycle } from '@ab/time';
import { lessonClock } from '@/today/lib/lesson-text';

/** The line for a refused join: the API's `code` in words (the room's own wording). */
export { classroomError as joinError } from '@ab/mobile-kit/room';

/** «بتفتح الساعة 15:45», on the viewer's clock `tz` like the row's own time. */
export const opensAtLine = (opensAt: string, cycle: ClockCycle, tz: string): string =>
  t.classroom.opensAt.replace('{time}', lessonClock(opensAt, tz, cycle));
