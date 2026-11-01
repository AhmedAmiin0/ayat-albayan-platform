import { addDays, weekdayOf } from './week.js';
import { hhmmIn, localDateIn, wallToUtc } from './zoned.js';

// A person's local day, clock and academy week as UTC instants (R-SCH-01, rule 6; row k3b,
// formerly the web schedule's tz.ts). Local dates «YYYY-MM-DD», times «HH:MM» (24 h).

export interface ZonedParts {
  /** Local calendar day, "YYYY-MM-DD". */
  date: string;
  /** Local wall clock, "HH:MM" (24h). */
  time: string;
  /** 0 = الأحد … 6 = السبت (same numbering as `byday` and teacher_availability.weekday). */
  weekday: number;
}

/** Local day, time and weekday of `instant` in `zone`. */
export function zonedPartsIn(instant: Date, zone: string): ZonedParts {
  const date = localDateIn(instant, zone);
  return { date, time: hhmmIn(instant, zone), weekday: weekdayOf(date) };
}

/** The 7 local days of the week starting `start`. */
export function weekDates(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** [from, to) instants of the local week starting `start` in `zone`. */
export function weekWindowIn(start: string, zone: string): { from: Date; to: Date } {
  return { from: wallToUtc(start, 0, zone), to: wallToUtc(addDays(start, 7), 0, zone) };
}
