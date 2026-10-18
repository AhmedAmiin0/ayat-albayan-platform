import type { Duration } from '../enums/index.js';
import type { DayTime } from '../lessons/day-times.js';
import { addLocalDays, weekdayOfDate, zonedInstant } from '../lessons/zoned.js';

// A booked course of the assistant (owner 2026-10-18): its weekdays and times, so a renewal can
// continue on them («تابِع بنفس الأيام») and a running course can change them («تغيير أيام الحلقات»).
// Pure, Intl only.

/**
 * One assistant course (the rules sharing a subscription_id, migration 470): its latest set of
 * rules (those ending on the course's last day), each weekday with its time in the rules' zone.
 */
export interface BookedCourse {
  subscriptionId: string;
  teacherId: string;
  durationMin: Duration;
  /** The rules' zone (the family's when booked). */
  tz: string;
  /** The course's last local day (its rules' ends_on). */
  endsOn: string;
  /** Each weekday (0 = الأحد) with its "HH:MM", in weekday order. */
  days: DayTime[];
  /** subscriptions.lessons_total of the course's subscription. */
  lessonsTotal: number;
  /** Days a week the plan needs (courseDaysPerWeek); null = a custom count the admin books. */
  perWeek: number | null;
}

/** The first day a renewal's course may start: after the previous one's last day, never before its subscription. */
export function continueFrom(previous: Pick<BookedCourse, 'endsOn'>, startsOn: string): string {
  const after = addLocalDays(previous.endsOn, 1);
  return after > startsOn ? after : startsOn;
}

export interface PrefillInput {
  days: readonly DayTime[];
  /** The first local day a pick may fall on. */
  from: string;
  tz: string;
  /** ISO now: a pick that already passed moves on a week. */
  now: string;
}

/**
 * The picks (UTC instants) of `days` in their first week from `from`: each weekday's first local
 * date on or after `from` at its time in `tz`, a week later when that is not in the future. Sorted.
 */
export function prefillPicks({ days, from, tz, now }: PrefillInput): string[] {
  const start = weekdayOfDate(from);
  return days
    .map((d) => {
      const date = addLocalDays(from, (d.weekday - start + 7) % 7);
      const at = zonedInstant(date, d.startTimeLocal, tz);
      return Date.parse(at) > Date.parse(now) ? at : zonedInstant(addLocalDays(date, 7), d.startTimeLocal, tz);
    })
    .sort((a, b) => Date.parse(a) - Date.parse(b));
}
