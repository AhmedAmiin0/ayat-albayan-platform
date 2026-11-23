import { addCalendarDays, addDaysIn, localDateIn, startOfDayIn, wallInstant } from '@ab/time';

// The day-before reminder's send instant and expiry (docs/12 §7, docs/23b §8). Pure; the zone math
// is the date-fns facade (goldens: time/golden/reminders.golden.test.ts pin every instant).

/** «YYYY-MM-DD» of `at` in `tz`. */
export const localDate = (at: Date, tz: string): string => localDateIn(at, tz);

/** Sent on the previous local day in the recipient's tz; null keeps the lesson's own time. */
export function dayBeforeSendAt(startsAt: Date, tz: string, sendAtLocal: string | null = null): Date {
  if (sendAtLocal === null) return addDaysIn(startsAt, -1, tz);
  return wallInstant(addCalendarDays(localDateIn(startsAt, tz), -1), sendAtLocal, tz);
}

/** The reminder expires at this local midnight, when "tomorrow" would be wrong. */
export const localDayStart = (at: Date, tz: string): Date => startOfDayIn(at, tz);
