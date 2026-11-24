import { clockOf, weekStart, weekWindowIn, zonedPartsIn } from '@ab/shared';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { Clock } from '@ab/web-kit/lib/clock';

/** A span of time: a week's bookable part, a schedule read's from/to. */
export interface Window {
  from: Date;
  to: Date;
}

// R-SCH-06: weeks run Saturday to Friday in the viewer's zone (docs/34).

/** Items grouped by their local day in `tz`, each day by start time. */
export function byLocalDay<T extends { starts_at: string }>(
  items: readonly T[],
  tz: string,
): Map<string, T[]> {
  const days = new Map<string, T[]>();
  for (const item of items.toSorted((a, b) => a.starts_at.localeCompare(b.starts_at))) {
    const day = zonedPartsIn(new Date(item.starts_at), tz).date;
    days.set(day, [...(days.get(day) ?? []), item]);
  }
  return days;
}

/** The Saturday that starts the current week in `tz` (the viewer's). */
export function currentWeekStart(now: Date, tz: string): string {
  return weekStart(zonedPartsIn(now, tz).date);
}

/** The viewer's week to open on: the anchor's (a picked slot, the moved lesson), not earlier. */
export function openingWeek(
  anchor: string | undefined,
  week0: { first: string; tz: string },
): string {
  const { first, tz } = week0;
  if (!anchor) return first;
  const week = weekStart(zonedPartsIn(new Date(anchor), tz).date);
  return week > first ? week : first;
}

/** The bookable part of a week in `tz`: from now on; null once the whole week is past. */
export function bookableWindow(start: string, now: Date, tz: string): Window | null {
  const week = weekWindowIn(start, tz);
  if (week.to <= now) return null;
  return { from: week.from > now ? week.from : now, to: week.to };
}

/** Adds the weekday when the student's zone is on another day; null when the clocks match. */
export function zoneLabel(
  instant: string,
  zones: { tz: string; base: string },
  clock: Clock,
): string | null {
  if (zones.tz === zones.base) return null;
  const at = new Date(instant);
  const local = zonedPartsIn(at, zones.tz);
  const base = zonedPartsIn(at, zones.base);
  const time = clockOf(at, { ...clock, tz: zones.tz });
  // Compared as 24 h keys; shown in the viewer's cycle.
  if (local.date === base.date) return local.time === base.time ? null : time;
  const day: Record<string, string> = t.enums.weekday;
  return `${time} ${day[String(local.weekday)] ?? ''}`.trim();
}
