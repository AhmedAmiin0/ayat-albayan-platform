import { bookingPicksFrom } from '@ab/client-core';
import { dayTimesKeeping, inWeekOrder } from '@ab/shared';
import { courseEndsOn, timeGroups, togglePick, wallParts, type PickedRule } from '@ab/schedule';
import type { BookingDraft } from './draft';

// A package picks one slot per weekday in the family's zone; a trial or makeup is one lesson.

type PickFields = Pick<BookingDraft, 'startsAt' | 'extra' | 'kind'>;
type ZonedPicks = PickFields & Pick<BookingDraft, 'tz'>;
/** With the course: its prefilled picks keep their days' own times. */
type RulePicks = ZonedPicks & Partial<Pick<BookingDraft, 'course'>>;

/** Every picked instant, earliest first (`startsAt` is kept the earliest). */
export function draftPicks(d: PickFields): string[] {
  if (!d.startsAt) return [];
  return d.kind === 'package' ? [d.startsAt, ...d.extra] : [d.startsAt];
}

/** The draft fields for these picks: the earliest becomes `startsAt` (@ab/client-core, docs/27 E5). */
export const withPicks: (picks: readonly string[]) => Pick<BookingDraft, 'startsAt' | 'extra'> =
  bookingPicksFrom;

/** Tapping a slot: a package toggles it among the picks (togglePick), else it replaces the one lesson. */
export function pickPatch(d: ZonedPicks, slot: string): Pick<BookingDraft, 'startsAt' | 'extra'> {
  if (d.kind !== 'package') return { startsAt: slot, extra: [] };
  return withPicks(togglePick({ picks: draftPicks(d), slot, tz: d.tz }));
}

/** A pick equal to a prefilled one keeps that day's own time (dayTimesKeeping). */
export const pickedRule = (d: RulePicks): PickedRule | null =>
  dayTimesKeeping(draftPicks(d), d.tz, d.course?.prefilled ?? []);

/** Sorted weekdays, 0 is Sunday. */
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
  return inWeekOrder(
    draftPicks(d).map((at) => {
      const w = wallParts(at, d.tz);
      return { at, weekday: w.weekday, time: w.time };
    }),
  );
}

/** The assistant's course: the local date of its last lesson, from the picks and the lesson count. */
export function courseEnd(d: RulePicks): string | null {
  const rule = pickedRule(d);
  if (!rule || !d.course) return null;
  return courseEndsOn({
    groups: timeGroups(rule),
    startsOn: rule.startsOn,
    lessonsTotal: d.course.lessonsTotal,
  });
}
