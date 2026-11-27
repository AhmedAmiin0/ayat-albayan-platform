import type { DayTime } from '@ab/schedule';
import { addLocalDays, weekdayOfDate, zonedInstant } from '@ab/time';
import type { BookedCourse } from './booked-course.schemas';

// A booked course's weekdays and times, so renewal can continue them or a change edit them; pure.

/**
 * The first day a renewal's course may start: after the previous one's last day, never before its
 * subscription.
 */
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

/** A prefilled pick: its instant and the day's own time, never re-read from the instant. */
export interface PrefilledPick {
  at: string;
  weekday: number;
  startTimeLocal: string;
}

const WEEK_MS = 7 * 86_400_000;

/**
 * Each of `days` on its first local date on or after `from` at its time in `tz`, moved on by whole
 * weeks until it is after `now` (a `from` weeks in the past still lands in the coming week).
 * Sorted.
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
