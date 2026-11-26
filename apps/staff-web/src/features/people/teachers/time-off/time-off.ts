import { timeOffCreateSchema, type TimeOffCreate } from '@ab/schedule';
import {
  addCalendarDays,
  dateRangeText,
  hhmmIn,
  localDateIn,
  wallInstant,
  wallToUtc,
} from '@ab/time';
import type { Clock } from '@ab/web-kit';
import { dateAndClock, viewerZone, t, locale } from '@ab/web-kit';

/** Whole days with the end day included, as typed. */
export type TimeOffDraft = { from: string; to: string; reason: string };
export const emptyTimeOffDraft: TimeOffDraft = { from: '', to: '', reason: '' };

// ponytail: whole days in the browser's zone (usually the teacher's own); converting from
// teacher.tz needs the API's zoned-time helper moved to @ab/shared.
/**
 * 'YYYY-MM-DD' 00:00 in `tz`, then the same wall clock `days` later, as UTC ISO. A midnight that
 * does not exist (Cairo 2026-04-24) starts at 01:00 and so does the day after it (time-off.golden).
 */
const dayStart = (date: string, at: { days: number; tz: string }) => {
  if (Number.isNaN(Date.parse(`${date}T00:00:00Z`))) return date; // blank or bad: the schema says
  const start = wallToUtc(date, 0, at.tz);
  const later = addCalendarDays(localDateIn(start, at.tz), at.days);
  return wallInstant(later, hhmmIn(start, at.tz), at.tz).toISOString();
};

/** The end is the day after the last day (UTC ISO, rule 6, R-TCH-02). */
export function toTimeOffBody(
  draft: TimeOffDraft,
  tz = viewerZone(),
): { ok: true; body: TimeOffCreate } | { ok: false; error: string } {
  const result = timeOffCreateSchema.safeParse({
    starts_at: dayStart(draft.from, { days: 0, tz }),
    ends_at: dayStart(draft.to, { days: 1, tz }),
    reason: draft.reason.trim() || null,
  });
  if (result.success) return { ok: true, body: result.data };
  // zod 4 still runs the end>start refine when a date is missing, so "missing" wins.
  const missing = result.error.issues.some((i) => i.message !== 'end_before_start');
  return { ok: false, error: missing ? t.common.required : t.common.endBeforeStart };
}

// Western digits (docs/07 §2): intlLocale carries `nu-latn` in both languages.
const DAYS = { weekday: 'long', day: 'numeric', month: 'long' } as const;
const atMidnight = (d: Date, tz: string) => hhmmIn(d, tz) === '00:00';

/** Whole days read as days with an exclusive end; anything else keeps its times. */
export function formatTimeOff(startIso: string, endIso: string, clock: Clock): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const tz = viewerZone();
  if (atMidnight(start, tz) && atMidnight(end, tz)) {
    const lastDay = new Date(end.getTime() - 60_000);
    return dateRangeText({ from: start, to: lastDay }, { tz, locale }, DAYS);
  }
  const zoned = { ...clock, tz };
  return `${dateAndClock(start, zoned, DAYS)} – ${dateAndClock(end, zoned, DAYS)}`;
}
