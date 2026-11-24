import { BOARD_DAYS } from '@ab/shared';
import { addDays, wallInstant } from '@ab/time';
import type { Window } from '@/features/teaching/schedule';

// docs/46 D4: one window, 14 days back and ahead in the teacher's zone, shared by the home.

/** [today − 14 days, today + 14 days) at local midnights in `tz` (28 days: one API call). */
export function boardWindow(today: string, tz: string): Window {
  return {
    from: wallInstant(addDays(today, -BOARD_DAYS), '00:00', tz),
    to: wallInstant(addDays(today, BOARD_DAYS), '00:00', tz),
  };
}
