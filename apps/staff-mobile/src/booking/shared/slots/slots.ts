import { clockTime, wallToUtc, weekdayOfDate } from '@ab/time';
import { localDate } from '@/today/lib/timeline';

// Free trial slots (R-SCH-06, R-SCH-01): the next 7 days of GET /booking/slots, laid out by the
// viewer's day, the viewer's time first and the student's own clock beside it when it differs
// (docs/34). Picked, never typed (rule 6): a slot is an instant, sent as is. Text helpers take the
// viewer's zone from the screen (useViewerTz), so a zone change re-renders them.

/** A plain duration: the window is 7 × 24 h of instants, not calendar days. */
const DAY = 86_400_000;
const WINDOW_DAYS = 7;
/** GET /booking/slots `from`/`to`: now → 7 days on (the API caps a window at 14). */
export function slotWindow(now: Date): { from: string; to: string } {
  return { from: now.toISOString(), to: new Date(now.getTime() + WINDOW_DAYS * DAY).toISOString() };
}

/** The instant a local day (YYYY-MM-DD) begins in `tz` (wallToUtc: two offset reads, as before). */
export function dayStartUtc(date: string, tz: string): Date {
  return wallToUtc(date, 0, tz);
}

/** Where the slot window opens: now, or `from` (an instant) when that is later. */
export function windowStart(now: Date, from?: string): Date {
  const at = from ? Date.parse(from) : NaN;
  return Number.isNaN(at) || at <= now.getTime() ? now : new Date(at);
}

/** The rule fields a slot fixes in the family's zone: local day, «HH:MM», weekday 0 = الأحد. */
export function ruleFromSlot(
  startsAt: string,
  tz: string,
): { startsOn: string; startTimeLocal: string; weekday: number } {
  const at = new Date(startsAt);
  const startsOn = localDate(at, tz);
  return {
    startsOn,
    startTimeLocal: clockTime(at, tz),
    weekday: weekdayOfDate(startsOn),
  };
}
