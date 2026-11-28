import { daysBetween } from '@ab/schedule';
import { addDays } from '@ab/time';
import type { CoursePauseProblem, CoursePauseView } from './course-pause.schemas';

// Course pause (docs/11 §7b, migrations 955-957); mirrors the RPCs' day arithmetic.

/** The first day lessons come back: the manual resume day (today) or the day after until. */
export function resumeDayOf(p: { until: string | null; today: string }): string {
  const after = p.until === null ? null : addDays(p.until, 1);
  return after !== null && after < p.today ? after : p.today;
}

/**
 * The days a resume moves a date (the package's renews_on, a rule's ends_on) forward, never
 * negative: counted from the later of the pause's from and that course's own start
 * (`courseStart`), so a course that began inside the pause moves only by its paused days and one
 * starting after it not at all (migration 956).
 */
export function pausedDays(p: {
  from: string;
  until: string | null;
  today: string;
  courseStart?: string | null;
}): number {
  const start = p.courseStart != null && p.courseStart > p.from ? p.courseStart : p.from;
  return Math.max(0, daysBetween(start, resumeDayOf(p)));
}

/** A date moved by a resume: null stays null (no renewal date, an open-ended rule). */
export const shiftedOrNull = (date: string | null, days: number): string | null =>
  date === null ? null : addDays(date, days);

/** The API's 400 before the RPC: from before Riyadh today, or until before from. */
export function coursePauseProblem(p: {
  from: string;
  until: string | null;
  today: string;
}): CoursePauseProblem | null {
  if (p.from < p.today) return 'date_in_past';
  if (p.until !== null && p.until < p.from) return 'invalid_range';
  return null;
}

/** Whether a pause holds the student's course today (from ≤ today and not past until). */
export function pauseCovers(
  pause: Pick<CoursePauseView, 'from_date' | 'until_date' | 'resumed_at'>,
  today: string,
): boolean {
  if (pause.resumed_at !== null) return false;
  return pause.from_date <= today && (pause.until_date === null || pause.until_date >= today);
}
