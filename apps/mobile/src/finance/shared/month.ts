import { RIYADH_TZ } from '@ab/shared';
import { localDate } from '@/today/lib/timeline';

/** This month in Riyadh, `YYYY-MM` (the academy's reporting clock, as the web's currentMonth). */
// academy day (docs/34 b): the finance month is the academy's.
export const currentMonth = (now: Date = new Date()): string => localDate(now, RIYADH_TZ).slice(0, 7);

/** `2026-12` + 1 → `2027-01`. */
export function shiftMonth(month: string, delta: number): string {
  const [y = 0, m = 1] = month.split('-').map(Number);
  const at = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${at.getUTCFullYear()}-${String(at.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Months after the current one hold nothing yet: the picker stops there. */
export const canGoNext = (month: string, now: Date = new Date()): boolean => month < currentMonth(now);

/** The four years the summary offers, newest first (the web's list). */
export function summaryYears(now: Date = new Date()): string[] {
  const year = Number(currentMonth(now).slice(0, 4));
  return Array.from({ length: 4 }, (_, i) => String(year - i));
}

/** A year's dashboard range in Riyadh days; the current year ends today. */
export function yearRange(year: string, now: Date = new Date()): { from: string; to: string } {
  const today = localDate(now, RIYADH_TZ);
  return { from: `${year}-01-01`, to: today.startsWith(year) ? today : `${year}-12-31` };
}
