import type { PackageSize } from '@ab/catalog';
import { packagePerWeek } from '@ab/money';
import { wallParts } from '@ab/schedule';
import type { CourseSubscription, SalesCourseView } from './sales-course';
import { continueFrom } from './course-follow';

// The assistant books the weekly course of a subscription she sold (R-ASST-01):
// exactly the plan's lesson count, the plan's days a week, each day with its own time.

/** How many lessons the course books: lessons_total − lessons_used_before. */
export const courseLessonCount = (
  sub: Pick<CourseSubscription, 'lessons_total' | 'lessons_used_before'>,
): number => sub.lessons_total - (sub.lessons_used_before ?? 0);

/**
 * Days a week the course must have: the package's (8 → 2), or for a custom count lessons_total / 4
 * when it divides evenly (a month = 4 weeks). null = the admin books it (custom_count_admin).
 */
export function courseDaysPerWeek(
  sub: Pick<CourseSubscription, 'package' | 'lessons_total'>,
): number | null {
  if (sub.package) return packagePerWeek(sub.package);
  const n = sub.lessons_total / 4;
  return Number.isInteger(n) && n >= 1 && n <= 7 ? n : null;
}

/**
 * The `package` a course's POST /sales/booking body carries: the subscription's, or for a custom count
 * any paid size the schema accepts ('8'). The API ignores it for a course and labels every rule with
 * the subscription's own package (null for a custom count, PR #113 review M4); never show it as a label.
 */
export const courseBodyPackage = (
  sub: Pick<CourseSubscription, 'package'>,
): Exclude<PackageSize, 'trial'> =>
  sub.package === null || sub.package === 'trial' ? '8' : sub.package;

/**
 * The first local day the course may start: the subscription's, or after a previous course's last
 * day (the guard refuses an overlap with course_exists), never before today in the family's zone
 * (`now` given). The slot grid opens on it.
 */
export function courseOpensOn(
  view: Pick<SalesCourseView, 'subscription' | 'previous' | 'student'>,
  now?: string,
): string | null {
  const sub = view.subscription;
  if (!sub) return null;
  const opens = view.previous ? continueFrom(view.previous, sub.starts_on) : sub.starts_on;
  if (!now) return opens;
  const today = wallParts(now, view.student.tz).date;
  return opens > today ? opens : today;
}

/** Continue on the same days only when the previous course had the new plan's days a week. */
export const continueFits = (view: Pick<SalesCourseView, 'previous' | 'perWeek'>): boolean =>
  !!view.previous && view.perWeek !== null && view.previous.days.length === view.perWeek;
