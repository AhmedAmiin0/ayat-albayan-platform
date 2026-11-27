import type { WeekLesson } from '@ab/client-core';
import type { ClockOptions } from '@ab/time';

export interface ScheduleRowProps {
  entry: WeekLesson;
  /** The viewer's clock (the week is on the phone's zone). */
  clock: ClockOptions;
  now: Date;
}
