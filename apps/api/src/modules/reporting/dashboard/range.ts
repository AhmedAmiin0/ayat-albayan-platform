import { dateRangeQuery, RIYADH_TZ, type DateRangeQuery } from '@ab/shared';
import { badRequest } from '../../../common/http/errors';
import { DAY, localDay, zonedToUtc } from '../../people/teachers/availability/zoned-time';
import { parseOrThrow } from '../../../common/http/http';

// `?from&to` (docs/11 §3): local days in Asia/Riyadh, inclusive, at most a year.

const RANGE_CODES = new Set(['invalid_range', 'range_too_large']);

/** 400 `{ code: invalid_range | range_too_large }` (ar.json dashboard.error), else validation_failed. */
export function parseRange(query: unknown): DateRangeQuery {
  const parsed = dateRangeQuery.safeParse(query);
  if (parsed.success) return parsed.data;
  const code = parsed.error.issues.map((i) => i.message).find((m) => RANGE_CODES.has(m));
  if (code) throw badRequest(code);
  return parseOrThrow(dateRangeQuery, query);
}

/** The UTC half-open window [from 00:00, to + 1 day 00:00) in Riyadh. */
export function rangeWindow(r: DateRangeQuery): { from: Date; to: Date } {
  return {
    from: new Date(zonedToUtc(Date.parse(r.from), 0, RIYADH_TZ)),
    to: new Date(zonedToUtc(Date.parse(r.to) + DAY, 0, RIYADH_TZ)),
  };
}

/** Riyadh calendar day of an instant, "YYYY-MM-DD". */
export function riyadhDate(iso: string): string {
  return new Date(localDay(Date.parse(iso), RIYADH_TZ)).toISOString().slice(0, 10);
}

/** Riyadh month of an instant, "YYYY-MM". */
export function riyadhMonth(iso: string): string {
  return riyadhDate(iso).slice(0, 7);
}

/** Every month the range touches, "YYYY-MM", oldest first. */
export function monthsOf(r: DateRangeQuery): string[] {
  const last = r.to.slice(0, 7);
  let year = Number(r.from.slice(0, 4));
  let month = Number(r.from.slice(5, 7));
  const out: string[] = [];
  for (;;) {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    out.push(key);
    if (key >= last) return out;
    month = month === 12 ? 1 : month + 1;
    if (month === 1) year += 1;
  }
}

/** "YYYY-MM" moved by `by` months → its first day, "YYYY-MM-01". */
export function monthShift(month: string, by: number): string {
  const first = Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + by, 1);
  return new Date(first).toISOString().slice(0, 10);
}
