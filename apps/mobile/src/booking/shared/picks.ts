import type { BookingPickFields } from '@ab/client-core';
import { wallParts } from '@ab/shared';
import { hhmm, type ViewerClock } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { cityOf } from './slots';

// A weekly package's picks (owner 2026-10-18: «اختر موعدًا لكل يوم»): one free slot per weekday of
// the family's zone, each with its own time. The draft keeps the earliest as startsAt and the
// others in `extra`, so a trial or a makeup (one slot) reads exactly as before.

/** The earliest pick (the first lesson) and the other picks' UTC instants (a package only), sorted. */
export type PickFields = BookingPickFields;

/** No slot picked: what a new teacher, length or package resets to (the slots depend on them). */
export const NO_PICKS: PickFields = { startsAt: null, extra: [] };

/** Every pick, earliest first; the picks back into the draft, the earliest as startsAt (@ab/client-core, docs/27 E5). */
export { bookingPicks as picksOf, bookingPicksFrom as fromPicks } from '@ab/client-core';

const weekdays: Record<string, string | undefined> = t.enums.weekday;

/**
 * «الأحد الساعة 18:00» for a weekday and its time in `tz`, «… 18:00 بتوقيت دبي» when that is not
 * the `viewer`'s zone (the web's dayAtText).
 */
export function dayAtText(day: { weekday: number; time: string }, tz: string, viewer: ViewerClock): string {
  const clock = hhmm(day.time, viewer.cycle);
  const time = tz === viewer.tz ? clock : t.schedule.inCity.replace('{time}', clock).replace('{city}', cityOf(tz));
  return t.booking.dayAt.replace('{day}', weekdays[String(day.weekday)] ?? '').replace('{time}', time);
}

/** A pick's day in the family's zone (dayAtText). */
export const dayLine = (pick: string, tz: string, viewer: ViewerClock): string =>
  dayAtText(wallParts(pick, tz), tz, viewer);
