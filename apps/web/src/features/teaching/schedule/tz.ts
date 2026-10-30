import { addDays, clockTime, intlLocale, weekdayOf, weekStart } from '@ab/shared';
import { locale } from '@/lib/i18n/locale';

// Wall-clock math for the schedule screens (R-SCH-01, rule 6). The DB and the API speak UTC
// instants; these helpers turn them into a person's local day / time with Intl only (no tz library,
// same approach as apps/api zoned-time.ts). Local dates are "YYYY-MM-DD", times "HH:MM".

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

const partsFormatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(tz: string): Intl.DateTimeFormat {
  let f = partsFormatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    partsFormatters.set(tz, f);
  }
  return f;
}

/** Local day, time and weekday of `instant` in `tz`. */
export function zonedParts(instant: Date, tz: string): ZonedParts {
  const parts = partsFormatter(tz).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '00';
  const date = `${get('year')}-${get('month')}-${get('day')}`;
  return { date, time: clockTime(instant, tz), weekday: weekdayOf(date) };
}

function utcOf(date: string): number {
  const [y = 0, m = 1, d = 1] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** The 7 local days of the week starting `start`. */
export function weekDays(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Minutes `tz` is ahead of UTC at `instant`. */
function offsetMin(instant: number, tz: string): number {
  const p = zonedParts(new Date(instant), tz);
  const [h = 0, mi = 0] = p.time.split(':').map(Number);
  return (utcOf(p.date) + (h * 60 + mi) * 60_000 - Math.floor(instant / 60_000) * 60_000) / 60_000;
}

/** The instant a wall clock (`date` `time`) happens in `tz`; DST-safe (second pass after a shift). */
export function zonedToUtc(date: string, time: string, tz: string): Date {
  const [h = 0, mi = 0] = time.split(':').map(Number);
  const wall = utcOf(date) + (h * 60 + mi) * 60_000;
  const first = wall - offsetMin(wall, tz) * 60_000;
  return new Date(wall - offsetMin(first, tz) * 60_000);
}

/** [from, to) instants of the local week starting `start` in `tz`. */
export function weekWindow(start: string, tz: string): { from: Date; to: Date } {
  return { from: zonedToUtc(start, '00:00', tz), to: zonedToUtc(addDays(start, 7), '00:00', tz) };
}

const dayFormatter = new Intl.DateTimeFormat(intlLocale(locale), {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

/** «3 أكتوبر» for a local date (Western digits). */
export function dayMonthLabel(date: string): string {
  return dayFormatter.format(new Date(utcOf(date)));
}

const dateFormatter = new Intl.DateTimeFormat(intlLocale(locale), {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/**
 * «3 أكتوبر 2026» for a local date: shown under native date inputs, which print the OS locale
 * («10/02/2026» reads as 10 February to an Egyptian or Saudi admin).
 */
export function dateLabel(date: string): string {
  return date ? dateFormatter.format(new Date(utcOf(date))) : '';
}
