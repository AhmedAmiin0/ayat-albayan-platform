import {
  addDays,
  clockTime,
  dateText,
  localDateIn,
  wallInstant,
  wallToUtc,
  weekdayOf,
  weekStart,
} from '@ab/shared';
import { locale } from '@/lib/i18n/locale';

// Wall-clock math for the schedule screens (R-SCH-01, rule 6). The DB and the API speak UTC
// instants; these helpers turn them into a person's local day / time through the date-fns facade
// of @ab/shared (docs/34 §7; tz.golden pins the instants). Local dates "YYYY-MM-DD", times "HH:MM".

/** Academy-week math on "YYYY-MM-DD" (same as the mobile calendar): shared since docs/27 E6. */
export { addDays, weekdayOf, weekStart };

export interface ZonedParts {
  /** Local calendar day, "YYYY-MM-DD". */
  date: string;
  /** Local wall clock, "HH:MM" (24h). */
  time: string;
  /** 0 = الأحد … 6 = السبت (same numbering as `byday` and teacher_availability.weekday). */
  weekday: number;
}

/** Local day, time and weekday of `instant` in `tz`. */
export function zonedParts(instant: Date, tz: string): ZonedParts {
  const date = localDateIn(instant, tz);
  return { date, time: clockTime(instant, tz), weekday: weekdayOf(date) };
}

/** The 7 local days of the week starting `start`. */
export function weekDays(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** The instant a wall clock (`date` `time`) happens in `tz`; DST-safe (second pass after a shift). */
export function zonedToUtc(date: string, time: string, tz: string): Date {
  return wallInstant(date, time, tz);
}

/** [from, to) instants of the local week starting `start` in `tz`. */
export function weekWindow(start: string, tz: string): { from: Date; to: Date } {
  return { from: wallToUtc(start, 0, tz), to: wallToUtc(addDays(start, 7), 0, tz) };
}

const atUtcMidnight = (date: string): Date => new Date(`${date}T00:00:00Z`);
const UTC_DAY = { tz: 'UTC', locale } as const;
const DAY_MONTH_YEAR = { day: 'numeric', month: 'long', year: 'numeric' } as const;

/** «3 أكتوبر» for a local date (Western digits). */
export function dayMonthLabel(date: string): string {
  return dateText(atUtcMidnight(date), UTC_DAY, { day: 'numeric', month: 'long' });
}

/**
 * «3 أكتوبر 2026» for a local date: shown under native date inputs, which print the OS locale
 * («10/02/2026» reads as 10 February to an Egyptian or Saudi admin).
 */
export function dateLabel(date: string): string {
  return date ? dateText(atUtcMidnight(date), UTC_DAY, DAY_MONTH_YEAR) : '';
}
