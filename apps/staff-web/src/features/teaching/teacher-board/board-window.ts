import { addDays, BOARD_DAYS, wallInstant } from '@ab/shared';
import type { Window } from '@/features/teaching/schedule';

// docs/46 D4: the board reads ONE window of the teacher's lessons, 14 days back and 14 ahead, in
// one zone (the teacher's own) for the whole home: the hero and «اليوم» filter the same rows.

/** [today − 14 days, today + 14 days) at local midnights in `tz` (28 days: one API call). */
export function boardWindow(today: string, tz: string): Window {
  return {
    from: wallInstant(addDays(today, -BOARD_DAYS), '00:00', tz),
    to: wallInstant(addDays(today, BOARD_DAYS), '00:00', tz),
  };
}
