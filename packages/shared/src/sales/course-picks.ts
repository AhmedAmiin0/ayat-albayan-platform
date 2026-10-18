import type { Weekday } from '../enums/index.js';
import { dayTimesFromPicks, timeGroups, wallParts, type DayTime, type PickedRule } from '../lessons/day-times.js';
import type { BookedCourse, PrefilledPick } from './course-follow.js';
import { prefillDays } from './course-follow.js';

// The picks of «تابِع بنفس الأيام» and «تغيير أيام الحلقات» (owner 2026-10-18), shared by web and
// mobile so both read the same days the same way. Pure, Intl only.

/** Days are shown السبت → الجمعة everywhere (docs/07 §8). */
export const WEEK_ORDER: readonly Weekday[] = [6, 0, 1, 2, 3, 4, 5];

/** Position of a weekday in WEEK_ORDER (a sort key). */
export const weekRank = (weekday: number): number => WEEK_ORDER.findIndex((w) => w === weekday);

/** `days` in WEEK_ORDER. */
export const inWeekOrder = <T extends { weekday: number }>(days: readonly T[]): T[] =>
  [...days].sort((a, b) => weekRank(a.weekday) - weekRank(b.weekday));

/**
 * The booking body's rule fields from the picks, a pick still equal to a prefilled one keeping its
 * day's own time (a DST gap or repeat on that date must not shift the time of the whole course).
 */
export function dayTimesKeeping(
  picks: readonly string[],
  tz: string,
  prefilled: readonly PrefilledPick[],
): PickedRule | null {
  const rule = dayTimesFromPicks(picks, tz);
  if (!rule) return null;
  const timeOf = (at: string): string => prefilled.find((p) => p.at === at)?.startTimeLocal ?? wallParts(at, tz).time;
  const days = [...picks].map((at) => ({ weekday: wallParts(at, tz).weekday, startTimeLocal: timeOf(at) }));
  const head = timeOf(rule.startsAt);
  return {
    ...rule,
    startTimeLocal: head,
    dayTimes: days.filter((d) => d.startTimeLocal !== head).sort((a, b) => a.weekday - b.weekday),
  };
}

/** Do the picks hold exactly these weekdays at these times (nothing changed yet)? */
export function samePicks(picks: readonly string[], tz: string, days: readonly DayTime[]): boolean {
  const key = (d: DayTime) => `${d.weekday}@${d.startTimeLocal}`;
  const picked = new Set(picks.map((at) => wallParts(at, tz)).map((w) => key({ weekday: w.weekday, startTimeLocal: w.time })));
  const wanted = new Set(days.map(key));
  return picked.size === wanted.size && [...wanted].every((k) => picked.has(k));
}

/** Does a request's weekday + time set equal the course's (the server's 400 no_change)? */
export function sameDays(req: { byday: readonly number[]; startTimeLocal: string; dayTimes?: readonly DayTime[] | undefined }, days: readonly DayTime[]): boolean {
  const key = (d: DayTime) => `${d.weekday}@${d.startTimeLocal.slice(0, 5)}`;
  const asked = timeGroups(req).flatMap((g) => g.byday.map((weekday) => key({ weekday, startTimeLocal: g.startTimeLocal })));
  const now = new Set(days.map(key));
  return asked.length === now.size && asked.every((k) => now.has(k));
}

/**
 * The change form's first picks: the course's own days from max(today in its zone, the first day of
 * its latest rules), so a course booked ahead (a renewal) opens on its own first week.
 */
export function changePicks(course: Pick<BookedCourse, 'days' | 'tz' | 'startsOn'>, now: Date): PrefilledPick[] {
  const today = wallParts(now.toISOString(), course.tz).date;
  const from = course.startsOn > today ? course.startsOn : today;
  return prefillDays({ days: course.days, from, tz: course.tz, now: now.toISOString() });
}
