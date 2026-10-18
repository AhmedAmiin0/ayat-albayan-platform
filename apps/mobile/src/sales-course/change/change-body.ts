import { dayTimesFromPicks, prefillPicks, type BookedCourse, type CourseChangeRequest } from '@ab/shared';
import { localDate } from '@/today/timeline';

// «تغيير أيام الحلقات» (owner 2026-10-18): new weekdays and times for the lessons of a running course
// that have not happened yet. The teacher, the length and the zone stay the course's. Pure.

/** The slot step's first picks: the course's own days, each on its next date from today in its zone. */
export function currentPicks(course: Pick<BookedCourse, 'days' | 'tz'>, now: Date): string[] {
  return prefillPicks({ days: course.days, from: localDate(now, course.tz), tz: course.tz, now: now.toISOString() });
}

export interface ChangeInput {
  subscriptionId: string;
  /** The picked slots (UTC instants), one per weekday of `tz`. */
  picks: readonly string[];
  /** The course's zone (its rules'). */
  tz: string;
  /** Idempotency key, the same on every retry of this flow (rule 8). */
  requestId: string;
}

/** POST /sales/booking/course/change (and …/check): the change point is the earliest pick; null without one. */
export function changeRequest({ subscriptionId, picks, tz, requestId }: ChangeInput): CourseChangeRequest | null {
  const picked = dayTimesFromPicks(picks, tz);
  if (!picked) return null;
  const { dayTimes, ...rule } = picked;
  return { subscriptionId, ...rule, ...(dayTimes.length > 0 ? { dayTimes } : {}), clientRequestId: requestId };
}
