import type { Duration, Gender, PackageSize, Program } from '../enums/index.js';
import { packagePerWeek } from '../money/tiers.js';

// The assistant books the weekly course of a subscription she sold (owner 2026-10-18, R-ASST-01):
// exactly the plan's lesson count, the plan's days a week, each day with its own time.

/** Why the assistant cannot book the course herself (null = she can). */
export const COURSE_BLOCKS = ['subscription_required', 'course_exists', 'custom_count_admin'] as const;
export type CourseBlock = (typeof COURSE_BLOCKS)[number];

/** The subscription facts the course follows. */
export interface CourseSubscription {
  id: string;
  /** null = a custom lesson count. */
  package: PackageSize | null;
  duration: Duration;
  lessons_total: number;
  starts_on: string;
}

/**
 * Days a week the course must have: the package's (8 → 2), or for a custom count lessons_total / 4
 * when it divides evenly (a month = 4 weeks). null = the admin books it (custom_count_admin).
 */
export function courseDaysPerWeek(sub: Pick<CourseSubscription, 'package' | 'lessons_total'>): number | null {
  if (sub.package) return packagePerWeek(sub.package);
  const n = sub.lessons_total / 4;
  return Number.isInteger(n) && n >= 1 && n <= 7 ? n : null;
}

/**
 * The `package` a course's POST /sales/booking body carries: the subscription's, or for a custom count
 * any paid size the schema accepts ('8'). The API ignores it for a course and labels every rule with
 * the subscription's own package (null for a custom count, PR #113 review M4); never show it as a label.
 */
export const courseBodyPackage = (sub: Pick<CourseSubscription, 'package'>): Exclude<PackageSize, 'trial'> =>
  sub.package === null || sub.package === 'trial' ? '8' : sub.package;

/** GET /sales/booking/course?studentId=: what the course wizard needs (no guardian, no money). */
export interface SalesCourseView {
  student: {
    id: string;
    code: string;
    name: string;
    tz: string;
    program: Program;
    teacher_gender_pref: Gender | null;
    teacher_id: string | null;
  };
  /** The newest unpaid or active subscription; null = subscription_required. */
  subscription: CourseSubscription | null;
  /** Days a week to pick; null when unknown (no subscription, or a custom count the admin books). */
  perWeek: number | null;
  blocked: CourseBlock | null;
}
