import { tz } from '@date-fns/tz';
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  format,
  getDay,
  startOfWeek,
  type Day,
} from 'date-fns';
import { localDateIn, offsetMinutesIn, wallToUtc } from './zoned.js';

// The date-fns facade, part 2 (docs/34 §7): calendar arithmetic. Two kinds of value:
// - a calendar date «YYYY-MM-DD» (a lesson's local day, a `?from&to` day): no zone at all;
// - an instant (Date) moved in a zone: its local day and wall clock decide (DST-safe).

const MINUTE = 60_000;

/** A half-open UTC window [from, to). */
export interface UtcRange {
  from: Date;
  to: Date;
}
const utc = tz('UTC');
const ymd = (d: Date): string => format(d, 'yyyy-MM-dd', { in: utc });
const atUtcMidnight = (date: string): Date => new Date(`${date}T00:00:00Z`);

/** The calendar date `days` later (negative: earlier); crosses months and years. */
export function addCalendarDays(date: string, days: number): string {
  return ymd(addDays(atUtcMidnight(date), days, { in: utc }));
}

/** The first day of the calendar month `months` after the one of «YYYY-MM» (or a date). */
export function addCalendarMonths(month: string, months: number): string {
  return ymd(addMonths(atUtcMidnight(`${month.slice(0, 7)}-01`), months, { in: utc }));
}

/** The same day `months` later (negative: earlier), clamped to a shorter month's last day. */
export function shiftCalendarMonths(date: string, months: number): string {
  return ymd(addMonths(atUtcMidnight(date), months, { in: utc }));
}

/** 0 = الأحد … 6 = السبت of a calendar date. */
export function weekdayOfDate(date: string): number {
  return getDay(atUtcMidnight(date), { in: utc });
}

/** The first day of `date`'s week; `weekStartsOn` 6 = the academy week (السبت → الجمعة). */
export function weekStartOfDate(date: string, weekStartsOn: Day = 6): string {
  return ymd(startOfWeek(atUtcMidnight(date), { in: utc, weekStartsOn }));
}

/** Midnight that starts `at`'s local day in `zone`, as a UTC instant (Cairo: 00:00 or 01:00). */
export function startOfDayIn(at: Date | number, zone: string): Date {
  return wallToUtc(localDateIn(at, zone), 0, zone);
}

/** Midnight that starts the local day after `at`'s, in `zone`: the half-open end of its day. */
export function endOfDayIn(at: Date | number, zone: string): Date {
  return wallToUtc(addCalendarDays(localDateIn(at, zone), 1), 0, zone);
}

/** The half-open UTC window [from 00:00, the day after `to` 00:00) of local days in `zone`. */
export function dayRangeIn(range: { from: string; to: string }, zone: string): UtcRange {
  const to = addCalendarDays(range.to, 1);
  return { from: wallToUtc(range.from, 0, zone), to: wallToUtc(to, 0, zone) };
}

/** «YYYY-MM» in `zone` → the half-open UTC window [1st 00:00, next 1st 00:00) (payroll month). */
export function monthRangeIn(month: string, zone: string): UtcRange {
  const first = `${month.slice(0, 7)}-01`;
  return { from: wallToUtc(first, 0, zone), to: wallToUtc(addCalendarMonths(first, 1), 0, zone) };
}

/**
 * `at` moved by `days` local days, the wall clock kept (24 h, or 23 / 25 h across a DST change in
 * `zone`): the same wall time on another day. Kept the legacy way (an offset correction of the
 * naive 24 h step) so the day-before reminder's instant stays byte-identical (goldens).
 */
export function addDaysIn(at: Date | number, days: number, zone: string): Date {
  const instant = new Date(at).getTime();
  const naive = addDays(instant, days, { in: utc }).getTime();
  const shift = offsetMinutesIn(zone, instant) - offsetMinutesIn(zone, naive);
  return new Date(naive + shift * MINUTE);
}

/** `at` moved by `weeks` local weeks, the wall clock kept (addDaysIn). */
export function addWeeksIn(at: Date | number, weeks: number, zone: string): Date {
  return addDaysIn(at, weeks * 7, zone);
}

/** Midnight (in `zone`) of the first day of `at`'s week; `weekStartsOn` 6 = the academy week. */
export function startOfWeekIn(at: Date | number, zone: string, weekStartsOn: Day = 6): Date {
  return wallToUtc(weekStartOfDate(localDateIn(at, zone), weekStartsOn), 0, zone);
}

/** Whole local days from `from` to `to` (calendar dates), e.g. 1 = tomorrow. */
export function calendarDaysBetween(from: string, to: string): number {
  return differenceInCalendarDays(atUtcMidnight(to), atUtcMidnight(from), { in: utc });
}
