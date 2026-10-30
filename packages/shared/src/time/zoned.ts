import { tz, tzOffset } from '@date-fns/tz';
import { format, getDay } from 'date-fns';

// The date-fns facade, part 1 (docs/34 §7): zoned wall clock ↔ UTC instant (rule 6). Apps import
// date helpers only through @ab/shared; date-fns and @date-fns/tz stay inside src/time.

const MINUTE = 60_000;
const contexts = new Map<string, ReturnType<typeof tz>>();

/** date-fns' `in` context for `zone`, built once per zone (they are pure functions). */
function inZone(zone: string): ReturnType<typeof tz> {
  let ctx = contexts.get(zone);
  if (!ctx) {
    ctx = tz(zone);
    contexts.set(zone, ctx);
  }
  return ctx;
}

/** Minutes `zone` is ahead of UTC at `at` (Riyadh +180; Cairo +120, +180 in summer). */
export function offsetMinutesIn(zone: string, at: Date | number): number {
  return tzOffset(zone, new Date(at));
}

/**
 * The UTC instant of `minutes` after midnight on the local `date` («YYYY-MM-DD») in `zone`.
 * Two offset reads (the rule every caller had before date-fns, kept byte for byte): a wall time
 * in a spring-forward gap and a repeated one resolve as they always did (goldens: zoned.golden).
 * `minutes` may be 1440 (24:00 = next midnight).
 */
export function wallToUtc(date: string, minutes: number, zone: string): Date {
  const wall = Date.parse(`${date}T00:00:00Z`) + minutes * MINUTE;
  const guess = wall - offsetMinutesIn(zone, wall) * MINUTE;
  return new Date(wall - offsetMinutesIn(zone, guess) * MINUTE);
}

/** "HH:MM" or "HH:MM:SS" (Postgres `time`) → minutes after midnight; "24:00" is 1440. */
function minutesOfHhmm(hhmm: string): number {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** The UTC instant of the wall time `hhmm` on local `date` in `zone` (wallToUtc). */
export function wallInstant(date: string, hhmm: string, zone: string): Date {
  return wallToUtc(date, minutesOfHhmm(hhmm), zone);
}

/** «YYYY-MM-DD»: the calendar day `at` falls on in `zone`. */
export function localDateIn(at: Date | number, zone: string): string {
  return format(at, 'yyyy-MM-dd', { in: inZone(zone) });
}

/** «HH:mm», 24 h, ASCII digits: the wall clock of `at` in `zone` (keys and server texts). */
export function hhmmIn(at: Date | number, zone: string): string {
  return format(at, 'HH:mm', { in: inZone(zone) });
}

export interface ZonedFields {
  year: number;
  /** 1 … 12. */
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/** The wall-clock fields of `at` in `zone`, as numbers. */
export function zonedFieldsIn(at: Date | number, zone: string): ZonedFields {
  const [year = 0, month = 1, day = 1, hour = 0, minute = 0] = format(at, 'yyyy M d H m', {
    in: inZone(zone),
  })
    .split(' ')
    .map(Number);
  return { year, month, day, hour, minute };
}

/** 0 = الأحد … 6 = السبت: the weekday `at` falls on in `zone` (the DB `byday` numbering). */
export function weekdayIn(at: Date | number, zone: string): number {
  return getDay(at, { in: inZone(zone) });
}
