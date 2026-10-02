import { clockTime } from '@ab/shared';
import { t } from '@/lib/i18n';
import type { Window } from './api';
import { RIYADH_TZ, weekStart, weekWindow, zonedParts } from './tz';

// Slot grid helpers (R-SCH-06): weeks are Riyadh weeks (السبت → الجمعة), the grid's big times are
// Riyadh and the small ones the student's zone (R-SCH-01). Pure, unit-tested.

/** Items grouped by their local day in `tz`, each day by start time. */
export function byLocalDay<T extends { starts_at: string }>(items: readonly T[], tz: string): Map<string, T[]> {
  const days = new Map<string, T[]>();
  for (const item of items.toSorted((a, b) => a.starts_at.localeCompare(b.starts_at))) {
    const day = zonedParts(new Date(item.starts_at), tz).date;
    days.set(day, [...(days.get(day) ?? []), item]);
  }
  return days;
}

/** The Saturday that starts the current Riyadh week. */
export function currentWeekStart(now: Date): string {
  return weekStart(zonedParts(now, RIYADH_TZ).date);
}

/** The bookable part of a Riyadh week: from now on; null once the whole week is past. */
export function bookableWindow(start: string, now: Date): Window | null {
  const week = weekWindow(start, RIYADH_TZ);
  if (week.to <= now) return null;
  return { from: week.from > now ? week.from : now, to: week.to };
}

/**
 * The small label under a Riyadh slot time: the wall clock in the student's zone, plus the
 * weekday when that zone is already on another day («18:00 السبت»). Null when the clock reads
 * the same as the base zone (Riyadh, or Kuwait / Cairo-in-summer at UTC+3): nothing to add.
 */
export function zoneLabel(instant: string, zones: { tz: string; base: string }): string | null {
  if (zones.tz === zones.base) return null;
  const at = new Date(instant);
  const local = zonedParts(at, zones.tz);
  const base = zonedParts(at, zones.base);
  const time = clockTime(at, zones.tz);
  if (local.date === base.date) return local.time === base.time ? null : time;
  const day: Record<string, string> = t.enums.weekday;
  return `${time} ${day[String(local.weekday)] ?? ''}`.trim();
}
