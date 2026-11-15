import type { LessonRow } from '@ab/client-core';
import { addCalendarDays, localDateIn, otherZoneClock, wallToUtc } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import type { Clock } from '@/lib/clock';

// The package's lesson rows (owner 2026-11-07: a date input and a time input per day): their date
// bounds, the slot window that checks them, and the clocks shown beside a time. Pure.

/** The date inputs' min (and max, when a route has one). */
export interface RowBounds {
  min: string;
  max?: string;
}

const filledDates = (rows: readonly LessonRow[]): string[] =>
  rows.map((r) => r.date).filter((d) => d !== '').sort();

/** The first day a row may take: the course's opening day, never before today in `tz`. */
export function rowsOpen(courseStartsOn: string | null, tz: string, now: Date): string {
  const today = localDateIn(now, tz);
  return courseStartsOn !== null && courseStartsOn > today ? courseStartsOn : today;
}

/**
 * What the API books: from the opening day on (a course: not before its subscription, 400
 * starts_before_subscription; any: not in the past, date_in_past). Neither route has a last day
 * (the grid paged on to any week), so there is no max; the rows must still fall in one week from
 * the earliest (farRows), each weekday once.
 */
export function rowBounds(opens: string): RowBounds {
  return { min: opens };
}

/** The week the rows fall in: from their earliest date (else `opens`). */
const weekOf = (rows: readonly LessonRow[], opens: string): string => filledDates(rows)[0] ?? opens;

/** Indexes of rows more than six days after the earliest one (each lesson day once a week). */
export function farRows(rows: readonly LessonRow[]): number[] {
  const first = filledDates(rows)[0];
  const last = first === undefined ? '' : addCalendarDays(first, 6);
  return rows.map((r, i) => (last !== '' && r.date > last ? i : -1)).filter((i) => i >= 0);
}

interface WindowAt {
  opens: string;
  tz: string;
  now: Date;
}

/** GET /booking/slots window: the rows' week in `tz`, from now on (≤ 8 days; the API caps 14). */
export function slotsWindow(rows: readonly LessonRow[], at: WindowAt): { from: Date; to: Date } {
  const first = weekOf(rows, at.opens);
  const start = wallToUtc(first, 0, at.tz);
  const to = wallToUtc(addCalendarDays(first, 7), 0, at.tz);
  return { from: start > at.now ? start : at.now, to };
}

export interface BesideZones {
  studentTz: string;
  viewerTz: string;
  teacherTz: string | null;
}

/** «بتوقيتك 16:00، عند المعلم/ة 15:00» beside a time, each only when that clock reads otherwise. */
export function besideText(at: string, zones: BesideZones, clock: Clock): string {
  const opts = { ...clock, tz: zones.studentTz };
  const instant = new Date(at);
  const viewer = otherZoneClock(instant, zones.viewerTz, opts);
  const teacher = otherZoneClock(instant, zones.teacherTz, opts);
  return [
    viewer === null ? '' : t.lessonTimes.viewerTime.replace('{time}', viewer),
    teacher === null ? '' : t.lessonTimes.teacherTime.replace('{time}', teacher),
  ]
    .filter((line) => line !== '')
    .join(t.common.listSeparator);
}
