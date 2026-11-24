import { addDays, RIYADH_TZ, riyadhToday, wallToUtc, weekStart } from '@ab/time';
import { useState } from 'react';

/** The week a slot picker shows, and how ‹ › moves it (PeriodSwitcher's props). */
export interface SlotWeek {
  /** The academy week's first day (a Saturday), YYYY-MM-DD. */
  week: string;
  thisWeek: string;
  /** When the picker opened: the slot window never starts before it. */
  now: Date;
  /** The slots route's window (slotWindow): the shown week, from now when it is this week. */
  from: string;
  to: string;
  prev: () => void;
  next: () => void;
  today: () => void;
}

/**
 * The picker's week (R-SCH-07): it opens on the lesson's week, never before this one (like the
 * web's `near`); ‹ › moves a week. academy day (docs/34 b): weeks page as the calendar's.
 */
export function useSlotWeek(startsAt: string): SlotWeek {
  const [now] = useState(() => new Date());
  const thisWeek = weekStart(riyadhToday(now));
  const [week, setWeek] = useState(() => {
    const own = weekStart(riyadhToday(new Date(startsAt)));
    return own > thisWeek ? own : thisWeek;
  });
  return {
    week,
    thisWeek,
    now,
    ...slotWindow(week, now),
    prev: () => setWeek(addDays(week, -7)),
    next: () => setWeek(addDays(week, 7)),
    today: () => setWeek(thisWeek),
  };
}

/** Riyadh midnight of `date` (YYYY-MM-DD) as a UTC instant (Riyadh keeps UTC+3 all year). */
const riyadhMidnight = (date: string): string => wallToUtc(date, 0, RIYADH_TZ).toISOString();

/**
 * The picker's window: the Riyadh week starting `week` (a Saturday), from now when it is this
 * week. The slots routes cap a window at 14 days; a week is 7.
 */
export function slotWindow(week: string, now: Date): { from: string; to: string } {
  const start = riyadhMidnight(week);
  return {
    from: start > now.toISOString() ? start : now.toISOString(),
    to: riyadhMidnight(addDays(week, 7)),
  };
}
