import {
  courseRemaining,
  sameDays,
  type CourseChangeRequest,
  type CourseLessonFact,
  type Duration,
} from '@ab/shared';
import { HttpStatus } from '@nestjs/common';
import { plannedCourseEnd } from '../core/booking.course-end';
import { domainError } from '../booking.errors';
import type { Plan } from '../plan/booking.plan';
import { planSeries, type SeriesRule } from '../plan/booking.series-plan';

// «تغيير أيام الحلقات» (owner 2026-10-18): the remaining lessons of a course on new days. Pure.

export type ChangeRole = 'sales' | 'admin';

/** What the request is checked against: the course's facts, read by CourseChange. */
export type ChangeFacts = {
  role: ChangeRole;
  /** Days a week the plan needs (courseDaysPerWeek); null = a custom count. */
  perWeek: number | null;
  lessonsTotal: number;
  durationMin: Duration;
  /** The course's zone (its rules'). */
  tz: string;
  /** The course's lessons that count and do not move, plus those its old rules will still generate. */
  before: readonly CourseLessonFact[];
};

/**
 * 400 date_in_past (the first new lesson is not in the future), 403 override_not_allowed (the
 * assistant never books over a clash), 409 custom_count_admin (the assistant, a custom count),
 * 400 days_count_mismatch (exactly the plan's days a week, when it has one).
 */
export function assertChange(req: CourseChangeRequest, facts: ChangeFacts, now: Date): void {
  if (Date.parse(req.startsAt) <= now.getTime())
    throw domainError(HttpStatus.BAD_REQUEST, 'date_in_past');
  if (facts.role === 'sales' && req.override)
    throw domainError(HttpStatus.FORBIDDEN, 'override_not_allowed');
  if (facts.perWeek === null && facts.role === 'sales')
    throw domainError(HttpStatus.CONFLICT, 'custom_count_admin');
  if (facts.perWeek !== null && req.byday.length !== facts.perWeek)
    throw domainError(HttpStatus.BAD_REQUEST, 'days_count_mismatch');
}

/** What the change point is checked against (review fix 4, 7). */
type StartFacts = {
  /** subscriptions.starts_on. */
  subStartsOn: string;
  /** Every rule of the course (any status). */
  rules: readonly { status: string; starts_on: string; ends_on: string | null; byday: readonly number[]; start_time_local: string }[];
};

/**
 * 400 starts_before_subscription (before the subscription starts), 400 starts_before_course (before the
 * course's first rule starts), 400 no_change (the same weekdays and times as the rules running at the
 * change point, for a client that did not stop it).
 */
export function assertStart(req: CourseChangeRequest, facts: StartFacts): void {
  if (req.startsOn < facts.subStartsOn) throw domainError(HttpStatus.BAD_REQUEST, 'starts_before_subscription');
  const first = facts.rules.map((r) => r.starts_on).sort()[0];
  if (first !== undefined && req.startsOn < first) throw domainError(HttpStatus.BAD_REQUEST, 'starts_before_course');
  const days = facts.rules
    .filter((r) => r.status === 'active' && (r.ends_on === null || r.ends_on >= req.startsOn))
    .flatMap((r) => r.byday.map((weekday) => ({ weekday, startTimeLocal: r.start_time_local.slice(0, 5) })));
  if (days.length > 0 && sameDays(req, days)) throw domainError(HttpStatus.BAD_REQUEST, 'no_change');
}

export type ChangePlan = {
  /** One plan per distinct time (planSeries), the first rule's first. */
  plans: Plan[];
  remaining: number;
  /** The remaining-th new lesson's local date: every new rule's ends_on. */
  endsOn: string;
};

type ChangePlanInput = {
  req: CourseChangeRequest;
  facts: ChangeFacts;
  now: Date;
  horizonWeeks: number;
};

/**
 * REMAINING = lessons_total − the course's lessons that count and stay (courseRemaining: the
 * balance views' rule); 409 course_finished when nothing is left. The new days carry exactly
 * REMAINING lessons: every new rule ends on the local date of the REMAINING-th one (400 no_occurrences
 * when a picked day has none). The teacher stays the course's (the caller fills it).
 */
export function planChange({ req, facts, now, horizonWeeks }: ChangePlanInput): ChangePlan {
  const remaining = courseRemaining(facts.lessonsTotal, facts.before);
  if (remaining <= 0) throw domainError(HttpStatus.CONFLICT, 'course_finished');
  const rule: SeriesRule = {
    byday: req.byday,
    startTimeLocal: req.startTimeLocal,
    dayTimes: req.dayTimes,
    tz: facts.tz,
    durationMin: facts.durationMin,
    startsOn: req.startsOn,
    startsAt: req.startsAt,
    single: false,
  };
  const endsOn = plannedCourseEnd({ rule, now, lessonsTotal: remaining });
  if (!endsOn) throw domainError(HttpStatus.BAD_REQUEST, 'no_occurrences');
  return { plans: planSeries({ rule, now, horizonWeeks, endsOn }), remaining, endsOn };
}
