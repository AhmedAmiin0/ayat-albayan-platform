import type { Weekday } from '../../enums/index.js';
import { dayTimesFromPicks, timeGroups, wallParts, type DayTime, type PickedRule } from '../../lessons/series/day-times.js';
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

/** Does a request's weekday + time set equal the course's (the server's 400 no_change)? */
export function sameDays(req: { byday: readonly number[]; startTimeLocal: string; dayTimes?: readonly DayTime[] | undefined }, days: readonly DayTime[]): boolean {
  const key = (d: DayTime) => `${d.weekday}@${d.startTimeLocal.slice(0, 5)}`;
  const asked = timeGroups(req).flatMap((g) => g.byday.map((weekday) => key({ weekday, startTimeLocal: g.startTimeLocal })));
  const now = new Set(days.map(key));
  return asked.length === now.size && asked.every((k) => now.has(k));
}

/**
 * The earliest day a change can start: today in the course's zone while it runs, else its opensOn
 * (the first lesson day of its active rules, the old ones too while a change is pending), never
 * before today. Only changePrefillFrom reads it; the forms open on the prefill, not on this day.
 */
export function changeOpensOn(course: Pick<BookedCourse, 'tz' | 'opensOn' | 'running'>, now: Date): string {
  const today = wallParts(now.toISOString(), course.tz).date;
  return !course.running && course.opensOn > today ? course.opensOn : today;
}

/**
 * The first day the change form prefills: the later of changeOpensOn and the course's startsOn.
 * Before startsOn only the old rules of a pending change hold lessons, so a latest-set day there
 * would move an old lesson on save (and miss the server's no_change).
 */
export function changePrefillFrom(course: Pick<BookedCourse, 'tz' | 'opensOn' | 'running' | 'startsOn'>, now: Date): string {
  const opens = changeOpensOn(course, now);
  return course.startsOn > opens ? course.startsOn : opens;
}

/** The change form's first picks: the course's own (latest) days from changePrefillFrom. */
export function changePicks(course: Pick<BookedCourse, 'days' | 'tz' | 'opensOn' | 'running' | 'startsOn'>, now: Date): PrefilledPick[] {
  return prefillDays({ days: course.days, from: changePrefillFrom(course, now), tz: course.tz, now: now.toISOString() });
}
