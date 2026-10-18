import { RIYADH_TZ, wallParts } from '@ab/shared';
import { t } from '@/lib/i18n';
import { cityOf } from './slots';

// A weekly package's picks (owner 2026-10-18: «اختر موعدًا لكل يوم»): one free slot per weekday of
// the family's zone, each with its own time. The draft keeps the earliest as startsAt and the
// others in `extra`, so a trial or a makeup (one slot) reads exactly as before.

export interface PickFields {
  /** The earliest pick (the first lesson). */
  startsAt: string | null;
  /** The other picks' UTC instants (a package only), sorted. */
  extra: string[];
}

/** No slot picked: what a new teacher, length or package resets to (the slots depend on them). */
export const NO_PICKS: PickFields = { startsAt: null, extra: [] };

/** Every pick, earliest first. */
export function picksOf(d: PickFields): string[] {
  return d.startsAt ? [d.startsAt, ...d.extra] : [];
}

/** The picks back into the draft: the earliest is startsAt. */
export function fromPicks(picks: readonly string[]): PickFields {
  const [first, ...rest] = [...picks].sort((a, b) => Date.parse(a) - Date.parse(b));
  return { startsAt: first ?? null, extra: rest };
}

const weekdays: Record<string, string | undefined> = t.enums.weekday;

/** «الأحد الساعة 18:00» in the family's zone, «… بتوقيت دبي» when that is not Riyadh. */
export function dayLine(pick: string, tz: string): string {
  const w = wallParts(pick, tz);
  const text = t.booking.dayAt.replace('{day}', weekdays[String(w.weekday)] ?? '').replace('{time}', w.time);
  return tz === RIYADH_TZ ? text : t.schedule.inCity.replace('{time}', text).replace('{city}', cityOf(tz));
}
