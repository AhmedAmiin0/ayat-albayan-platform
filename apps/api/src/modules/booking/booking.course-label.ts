import type { PackageSize } from '@ab/shared';

/** PR #113 review M3 / M4: the server owns a course's package (null = a custom count) and ties it to its subscription. */
export type CourseLabel = {
  package: PackageSize | null;
  subscriptionId: string;
  /** The earlier course a renewal follows (owner 2026-10-18), for the audit row; null = none. */
  follows?: string | null;
};

/** rule.subscription_id only on an assistant course: every other payload is unchanged. */
export const courseTie = (course: CourseLabel | undefined) =>
  course ? { subscription_id: course.subscriptionId } : {};

/** audit.after names the assistant's course (its subscription), the actor's role and the course it follows. */
export const courseAudit = (course: CourseLabel | undefined) =>
  course
    ? { by: 'sales', subscription_id: course.subscriptionId, follows: course.follows ?? null }
    : {};
