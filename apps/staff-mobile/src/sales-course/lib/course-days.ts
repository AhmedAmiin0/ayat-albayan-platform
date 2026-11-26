import { inWeekOrder, WEEK_ORDER } from '@ab/shared';
import {
  timeGroups,
  wallParts,
  type Conflict,
  type CourseChangeRequest,
  type DayTime,
} from '@ab/schedule';
import { dayAtText } from '@/booking/shared/picks';
import type { ViewerClock } from '@/core/lib/clock';
import { t } from '@ab/mobile-kit';

// Pure.

const weekdays: Record<string, string | undefined> = t.enums.weekday;

export const weekdayName = (weekday: number): string => weekdays[String(weekday)] ?? '';

/** Each day with its time in `tz`, Saturday first. */
export function daysText(days: readonly DayTime[], tz: string, viewer: ViewerClock): string {
  return inWeekOrder(days)
    .map((d) => dayAtText({ weekday: d.weekday, time: d.startTimeLocal }, tz, viewer))
    .join(t.common.listSeparator);
}

/** The weekdays and times a change request asks for (its own groups, so a kept day keeps its time). */
export function requestDays(
  body: Pick<CourseChangeRequest, 'byday' | 'startTimeLocal' | 'dayTimes'>,
): DayTime[] {
  return timeGroups(body).flatMap((g) =>
    g.byday.map((weekday) => ({ weekday, startTimeLocal: g.startTimeLocal })),
  );
}

export interface TakenInput {
  /** Every pick now (UTC instants). */
  picks: readonly string[];
  /** The prefilled picks (the previous course's days); empty when she picked her own. */
  prefilled: readonly string[];
  /** The family's zone. */
  tz: string;
}

/** Weekdays in `tz`, Saturday first, matching the web's rule. */
export function takenDays(
  { picks, prefilled, tz }: TakenInput,
  conflicts: readonly Pick<Conflict, 'startsAt'>[],
): number[] {
  const kept = new Set(
    picks.filter((p) => prefilled.includes(p)).map((p) => wallParts(p, tz).weekday),
  );
  const hit = new Set(
    conflicts.map((c) => wallParts(c.startsAt, tz).weekday).filter((w) => kept.has(w)),
  );
  return WEEK_ORDER.filter((w) => hit.has(w));
}

export const takenTexts = (input: TakenInput, conflicts: readonly Pick<Conflict, 'startsAt'>[]): string[] =>
  takenDays(input, conflicts).map((w) => t.booking.courseChange.continueTaken.replace('{day}', weekdayName(w)));
