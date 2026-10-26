import { courseDaysPerWeek, type BookingRequest, type CourseBlock, type CourseSubscription, type PackageSize } from '@ab/shared';
import { HttpStatus } from '@nestjs/common';

// The assistant's course of a subscription she sold (owner 2026-10-18, R-ASST-01): pure rules,
// read by SalesCourse (sales-course.service.ts). Local dates "YYYY-MM-DD" compare as strings.

/** An active schedule_rules row of the student (schedule_rule_students). */
export type CourseRule = { starts_on: string; ends_on: string | null; package: PackageSize | null };

/**
 * A weekly course: not a trial and not a one-day rule (a makeup or an instant lesson ends the day it
 * starts). An imported rule may have no package: it still counts.
 */
export const isCourseRule = (r: CourseRule): boolean => r.package !== 'trial' && r.starts_on !== r.ends_on;

export type CourseFacts = {
  req: Pick<BookingRequest, 'durationMin' | 'startsOn' | 'byday'>;
  /** The student's newest unpaid or active subscription. */
  sub: CourseSubscription | null;
  /** The student's active rules. */
  rules: readonly CourseRule[];
  /** The new course's last local day (plannedCourseEnd); null = a picked day has no lesson. */
  endsOn: string | null;
  /** The subscription already has its course (a rule with its subscription_id, any status). */
  booked: boolean;
};
type CourseProblem = { status: HttpStatus; code: string };

const problem = (status: HttpStatus, code: string): CourseProblem => ({ status, code });

/** The request against the subscription it books: kind of lessons, start and days a week (decision 4). */
function subscriptionProblem(req: CourseFacts['req'], sub: CourseSubscription): CourseProblem | null {
  // The package is the subscription's whatever the client sent (review M4): only the length must match.
  if (req.durationMin !== sub.duration) return problem(HttpStatus.BAD_REQUEST, 'course_mismatch');
  if (req.startsOn < sub.starts_on) return problem(HttpStatus.BAD_REQUEST, 'starts_before_subscription');
  const perWeek = courseDaysPerWeek(sub);
  if (perWeek === null) return problem(HttpStatus.CONFLICT, 'custom_count_admin');
  if (req.byday.length !== perWeek) return problem(HttpStatus.BAD_REQUEST, 'days_count_mismatch');
  return null;
}

/** Does a weekly course of the student run on any day of [from, to] (to null = open-ended)? */
export function courseOverlaps(rules: readonly CourseRule[], span: { from: string; to: string | null }): boolean {
  return rules.some(
    (r) => isCourseRule(r) && (span.to === null || r.starts_on <= span.to) && (r.ends_on === null || r.ends_on >= span.from),
  );
}

/**
 * Why the assistant may not book this course (null = she may), in this order: 409 subscription_required
 * (no unpaid / active subscription), 400 course_mismatch (another duration), 400
 * starts_before_subscription, 409 custom_count_admin (a lesson count with no whole days a week), 400
 * days_count_mismatch (the plan's days a week exactly), 409 course_exists (the subscription already has
 * its course, or a course of the student overlaps it; one starting after the current one's last day is
 * fine), 400 no_occurrences (a picked day has no lesson).
 */
export function courseProblem({ req, sub, rules, endsOn, booked }: CourseFacts): CourseProblem | null {
  if (!sub) return problem(HttpStatus.CONFLICT, 'subscription_required');
  const bad = subscriptionProblem(req, sub);
  if (bad) return bad;
  if (booked) return problem(HttpStatus.CONFLICT, 'course_exists');
  if (endsOn === null) return problem(HttpStatus.BAD_REQUEST, 'no_occurrences');
  if (courseOverlaps(rules, { from: req.startsOn, to: endsOn })) return problem(HttpStatus.CONFLICT, 'course_exists');
  return null;
}

type BlockFacts = { sub: CourseSubscription | null; rules: readonly CourseRule[]; today: string; booked: boolean };

/**
 * The course wizard's gate before anything is picked (GET /sales/booking/course): no subscription,
 * a custom count the admin books, the subscription's course already booked, or a weekly course still
 * running today or later.
 */
export function courseBlock(facts: BlockFacts): CourseBlock | null {
  if (!facts.sub) return 'subscription_required';
  if (courseDaysPerWeek(facts.sub) === null) return 'custom_count_admin';
  if (facts.booked) return 'course_exists';
  return courseOverlaps(facts.rules, { from: facts.today, to: null }) ? 'course_exists' : null;
}
