import { clockOf } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import type { Window } from '@/features/teaching/schedule/api';
import { weekStart, weekWindow, zonedParts } from '@/features/teaching/schedule/tz';
import type { Clock } from '@/lib/clock';

// Slot grid helpers (R-SCH-06): weeks run السبت → الجمعة in the viewer's zone (docs/34), the grid's
// big times are the viewer's and the small ones the student's zone (R-SCH-01). Pure, unit-tested.

/** Items grouped by their local day in `tz`, each day by start time. */
export function byLocalDay<T extends { starts_at: string }>(items: readonly T[], tz: string): Map<string, T[]> {
  const days = new Map<string, T[]>();
  for (const item of items.toSorted((a, b) => a.starts_at.localeCompare(b.starts_at))) {
    const day = zonedParts(new Date(item.starts_at), tz).date;
    days.set(day, [...(days.get(day) ?? []), item]);
  }
  return days;
}

/** The Saturday that starts the current week in `tz` (the viewer's). */
export function currentWeekStart(now: Date, tz: string): string {
  return weekStart(zonedParts(now, tz).date);
}

/** The bookable part of a week in `tz`: from now on; null once the whole week is past. */
export function bookableWindow(start: string, now: Date, tz: string): Window | null {
  const week = weekWindow(start, tz);
  if (week.to <= now) return null;
  return { from: week.from > now ? week.from : now, to: week.to };
}

/**
 * The small label under a slot time (viewer's zone): the wall clock in the student's zone, plus the
 * weekday when that zone is already on another day («18:00 السبت»). Null when the clock reads
 * the same as the base zone (e.g. Riyadh vs Kuwait / Cairo-in-summer at UTC+3): nothing to add.
 */
export function zoneLabel(instant: string, zones: { tz: string; base: string }, clock: Clock): string | null {
  if (zones.tz === zones.base) return null;
  const at = new Date(instant);
  const local = zonedParts(at, zones.tz);
  const base = zonedParts(at, zones.base);
  const time = clockOf(at, { ...clock, tz: zones.tz });
  // Compared as 24 h keys; shown in the viewer's cycle.
  if (local.date === base.date) return local.time === base.time ? null : time;
  const day: Record<string, string> = t.enums.weekday;
  return `${time} ${day[String(local.weekday)] ?? ''}`.trim();
}
