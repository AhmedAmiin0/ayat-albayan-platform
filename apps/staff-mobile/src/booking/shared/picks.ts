import type { BookingPickFields } from '@ab/client-core';
import { wallParts } from '@ab/schedule';
import { hhmm, type ViewerClock } from '@/core/lib/clock';
import { t, cityOf } from '@ab/mobile-kit';

// One slot per weekday; earliest is startsAt, others in extra, so one-slot bookings are unchanged.

/** The earliest pick (the first lesson) and the other picks' UTC instants (a package only), sorted. */
export type PickFields = BookingPickFields;

/** No slot picked: what a new teacher, length or package resets to (the slots depend on them). */
export const NO_PICKS: PickFields = { startsAt: null, extra: [] };

/** Every pick, earliest first; the picks back into the draft, the earliest as startsAt (@ab/client-core, docs/27 E5). */
export { bookingPicks as picksOf, bookingPicksFrom as fromPicks } from '@ab/client-core';

const weekdays: Record<string, string | undefined> = t.enums.weekday;

/** Weekday and time in tz, naming the zone when it differs from the viewer's. */
export function dayAtText(day: { weekday: number; time: string }, tz: string, viewer: ViewerClock): string {
  const clock = hhmm(day.time, viewer.cycle);
  const time = tz === viewer.tz ? clock : t.schedule.inCity.replace('{time}', clock).replace('{city}', cityOf(tz));
  return t.booking.dayAt.replace('{day}', weekdays[String(day.weekday)] ?? '').replace('{time}', time);
}

/** A pick's day in the family's zone (dayAtText). */
export const dayLine = (pick: string, tz: string, viewer: ViewerClock): string =>
  dayAtText(wallParts(pick, tz), tz, viewer);
