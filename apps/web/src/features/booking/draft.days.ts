import { courseEndsOn, dayTimesFromPicks, timeGroups, togglePick, wallParts, type PickedRule } from '@ab/shared';
import { WEEK_ORDER } from '@/features/teachers/grid';
import type { BookingDraft } from './draft';

// The picked slots of the booking wizard (owner 2026-10-18: «اختر موعدًا لكل يوم»). A package picks
// one slot per weekday of the family's zone, each at its own time: `startsAt` is the earliest pick,
// `extra` the others. A trial or a makeup is exactly one lesson: only `startsAt`. Pure.

type PickFields = Pick<BookingDraft, 'startsAt' | 'extra' | 'kind'>;
type ZonedPicks = PickFields & Pick<BookingDraft, 'tz'>;

/** Every picked instant, earliest first (`startsAt` is kept the earliest). */
export function draftPicks(d: PickFields): string[] {
  if (!d.startsAt) return [];
  return d.kind === 'package' ? [d.startsAt, ...d.extra] : [d.startsAt];
}

/** The draft fields for these picks: the earliest becomes `startsAt`. */
export function withPicks(picks: readonly string[]): Pick<BookingDraft, 'startsAt' | 'extra'> {
  const sorted = [...picks].sort((a, b) => Date.parse(a) - Date.parse(b));
  return { startsAt: sorted[0] ?? null, extra: sorted.slice(1) };
}

/** Tapping a slot: a package toggles it among the picks (togglePick), else it replaces the one lesson. */
export function pickPatch(d: ZonedPicks, slot: string): Pick<BookingDraft, 'startsAt' | 'extra'> {
  if (d.kind !== 'package') return { startsAt: slot, extra: [] };
  return withPicks(togglePick({ picks: draftPicks(d), slot, tz: d.tz }));
}

/** The rule fields the picks fix in the family zone (byday, first day and time, the other days' times). */
export const pickedRule = (d: ZonedPicks): PickedRule | null => dayTimesFromPicks(draftPicks(d), d.tz);

/** The weekdays booked (0 = الأحد), sorted. */
export const days = (d: ZonedPicks): number[] => pickedRule(d)?.byday ?? [];

export interface DayPick {
  /** The picked instant (the first lesson on that weekday). */
  at: string;
  weekday: number;
  /** "HH:MM" in the family zone. */
  time: string;
}

/** Each picked day with its time, Saturday first like every week in the app (docs/07 §8). */
export function dayPicks(d: ZonedPicks): DayPick[] {
  const order = (w: number) => WEEK_ORDER.findIndex((x) => x === w);
  return draftPicks(d)
    .map((at) => {
      const w = wallParts(at, d.tz);
      return { at, weekday: w.weekday, time: w.time };
    })
    .sort((a, b) => order(a.weekday) - order(b.weekday));
}

/** The assistant's course: the local date of its last lesson, from the picks and the lesson count. */
export function courseEnd(d: ZonedPicks & Pick<BookingDraft, 'course'>): string | null {
  const rule = pickedRule(d);
  if (!rule || !d.course) return null;
  return courseEndsOn({ groups: timeGroups(rule), startsOn: rule.startsOn, lessonsTotal: d.course.lessonsTotal });
}
