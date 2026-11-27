import type { WeekDay } from '@ab/client-core';
import type { ClockOptions } from '@ab/time';

export interface ScheduleDayProps {
  day: WeekDay;
  clock: ClockOptions;
  now: Date;
}
