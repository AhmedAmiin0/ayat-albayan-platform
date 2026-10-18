import { changePicks, dayTimesKeeping, type BookedCourse, type PrefilledPick } from '@ab/shared';
import type { CourseChangeBody } from './api';

// «تغيير أيام الحلقات» (owner 2026-10-18): the dialog's picks (one slot per weekday, each at its own
// time, in the course's zone) and the request they make. Pure.

/**
 * The current days as picks, each with its day's own time, in their first future week from
 * max(today, the course's first day) in the course zone: a course booked ahead opens on its own week.
 */
export const currentPicks = (course: Pick<BookedCourse, 'days' | 'tz' | 'startsOn'>, now: Date): PrefilledPick[] =>
  changePicks(course, now);

/** Exactly the plan's days a week; a custom count (perWeek null) needs at least one. */
export const picksReady = (course: Pick<BookedCourse, 'perWeek'>, picks: readonly string[]): boolean =>
  course.perWeek === null ? picks.length > 0 : picks.length === course.perWeek;

export interface ChangeBodyInput {
  course: Pick<BookedCourse, 'subscriptionId' | 'tz'>;
  picks: readonly string[];
  /** The form's first picks (currentPicks): one still picked keeps its day's own time (DST-safe). */
  prefilled?: readonly PrefilledPick[] | undefined;
  requestId: string;
  /** The admin's reason to save over clashes (R-SCH-04). */
  override?: string | undefined;
}

/** POST …/course/change[/check] body; null with nothing picked. */
export function changeBody({ course, picks, prefilled = [], requestId, override }: ChangeBodyInput): CourseChangeBody | null {
  const rule = dayTimesKeeping(picks, course.tz, prefilled);
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
