import { addCalendarDays, addDaysIn, localDateIn, startOfDayIn, wallInstant } from '../../time/index.js';

// The day-before reminder's send instant and expiry (docs/12 §7, docs/23b §8). Pure; the zone math
// is the date-fns facade (goldens: time/golden/reminders.golden.test.ts pin every instant).

/** «YYYY-MM-DD» of `at` in `tz`. */
export const localDate = (at: Date, tz: string): string => localDateIn(at, tz);

/**
 * The day-before reminder goes out on the previous local day in the recipient's tz (so «بكرة» is
 * always true). sendAtLocal null (today's behaviour): at the lesson's own wall-clock time, 24 h, or
 * 23 / 25 h across a DST change. sendAtLocal «HH:MM» (the rule's send_at_local): at that local time.
 */
export function dayBeforeSendAt(startsAt: Date, tz: string, sendAtLocal: string | null = null): Date {
  if (sendAtLocal === null) return addDaysIn(startsAt, -1, tz);
  return wallInstant(addCalendarDays(localDateIn(startsAt, tz), -1), sendAtLocal, tz);
}

/**
 * Midnight that starts `at`'s local day in `tz`, as a UTC instant. The day-before reminder expires
 * then: sent any later (gate closed, retries) its «بكرة» would already be «النهاردة».
 */
export const localDayStart = (at: Date, tz: string): Date => startOfDayIn(at, tz);
