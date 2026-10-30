import type { Duration } from '../../enums/index.js';
import type { DayTime } from '../../schedule/lessons/series/day-times.js';
import { addLocalDays, weekdayOfDate, zonedInstant } from '../../schedule/lessons/series/zoned.js';

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
  /** The course teacher's zone (a clash is also shown in it). */
  teacherTz: string;
  durationMin: Duration;
  /** The rules' zone (the family's when booked). */
  tz: string;
  /**
   * The first local day of its latest set of rules (`days`): before it only the old rules of a pending
   * change hold lessons, so the change form's prefill starts on it at the earliest (changePicks).
   */
  startsOn: string;
  /** The course's last local day (its rules' ends_on). */
  endsOn: string;
  /**
   * Some active rule of it covers today in its zone (server-computed): it runs this week, even when a
   * change saved earlier starts its latest set (startsOn) later. false = booked to start later.
   */
  running: boolean;
  /**
   * The first local day ≥ today any active rule of it may still hold a lesson on (server-computed): a
   * course booked ahead whose pending change starts later keeps its old days before startsOn.
   */
  opensOn: string;
  /** Each weekday (0 = الأحد) with its "HH:MM", in weekday order. */
  days: DayTime[];
  /** The lessons the course books: lessons_total − lessons_used_before (courseLessonCount, owner 2026-10-28). */
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
  /** ISO now: a pick that already passed moves on by whole weeks until it is ahead. */
  now: string;
}

/** A prefilled pick: its instant and the day's own time, carried as is (never re-read from the instant). */
export interface PrefilledPick {
  at: string;
  weekday: number;
  startTimeLocal: string;
}

const WEEK_MS = 7 * 86_400_000;

/**
 * Each of `days` on its first local date on or after `from` at its time in `tz`, moved on by whole
 * weeks until it is after `now` (a `from` weeks in the past still lands in the coming week). Sorted.
 */
export function prefillDays({ days, from, tz, now }: PrefillInput): PrefilledPick[] {
  const start = weekdayOfDate(from);
  const nowMs = Date.parse(now);
  return days
    .map((d) => {
      let date = addLocalDays(from, (d.weekday - start + 7) % 7);
      const behind = nowMs - Date.parse(zonedInstant(date, d.startTimeLocal, tz));
      if (behind >= 0) date = addLocalDays(date, 7 * (Math.floor(behind / WEEK_MS) + 1));
      let at = zonedInstant(date, d.startTimeLocal, tz);
      // A DST shift can leave the rolled pick an hour short of now: one more week.
      if (Date.parse(at) <= nowMs) at = zonedInstant(addLocalDays(date, 7), d.startTimeLocal, tz);
      return { at, weekday: d.weekday, startTimeLocal: d.startTimeLocal };
    })
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

/** prefillDays' instants only. */
export const prefillPicks = (input: PrefillInput): string[] => prefillDays(input).map((p) => p.at);
