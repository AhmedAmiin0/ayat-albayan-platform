import { dayTimesFromPicks, prefillPicks, type BookedCourse } from '@ab/shared';
import { zonedParts } from '@/features/schedule/tz';
import type { CourseChangeBody } from './api';

// «تغيير أيام الحلقات» (owner 2026-10-18): the dialog's picks (one slot per weekday, each at its own
// time, in the course's zone) and the request they make. Pure.

/** The current days as picks, in their first future week from today (course zone). */
export function currentPicks(course: Pick<BookedCourse, 'days' | 'tz'>, now: Date): string[] {
  const from = zonedParts(now, course.tz).date;
  return prefillPicks({ days: course.days, from, tz: course.tz, now: now.toISOString() });
}

/** Exactly the plan's days a week; a custom count (perWeek null) needs at least one. */
export const picksReady = (course: Pick<BookedCourse, 'perWeek'>, picks: readonly string[]): boolean =>
  course.perWeek === null ? picks.length > 0 : picks.length === course.perWeek;

export interface ChangeBodyInput {
  course: Pick<BookedCourse, 'subscriptionId' | 'tz'>;
  picks: readonly string[];
  requestId: string;
  /** The admin's reason to save over clashes (R-SCH-04). */
  override?: string | undefined;
}

/** POST …/course/change[/check] body; null with nothing picked. */
export function changeBody({ course, picks, requestId, override }: ChangeBodyInput): CourseChangeBody | null {
  const rule = dayTimesFromPicks(picks, course.tz);
  if (!rule) return null;
  return {
    subscriptionId: course.subscriptionId,
    byday: rule.byday,
    startTimeLocal: rule.startTimeLocal,
    startsOn: rule.startsOn,
    startsAt: rule.startsAt,
    ...(rule.dayTimes.length > 0 ? { dayTimes: rule.dayTimes } : {}),
    ...(override ? { override: { reason: override } } : {}),
    clientRequestId: requestId,
  };
}
