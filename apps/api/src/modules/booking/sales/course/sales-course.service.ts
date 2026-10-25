import { addLocalDays, courseDaysPerWeek, wallParts, type BookingRequest, type CourseSubscription, type SalesCourseView } from '@ab/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { plannedCourseEnd } from '../../core/booking.course-end';
import { courseFacts } from '../../core/course-read';
import { domainError } from '../../booking.errors';
import type { PrepareOptions } from '../../plan/booking.planner';
import { SalesBookingScope } from '../booking/sales-booking.ownership';
import { assertOwnStudents } from '../booking/sales-booking.scope';
import { SalesCourseQueries } from './sales-course.queries';
import { courseBlock, courseProblem } from './sales-course.rules';

/**
 * The assistant books the weekly course of the subscription she sold (owner 2026-10-18, R-ASST-01,
 * R-ASST-04): exactly lessons_total lessons (every rule ends on plannedCourseEnd), the plan's days a
 * week, no invoice (the transfer is recorded on the subscription), the subscription's own package and
 * one course per subscription (every rule carries its subscription_id, migration 470). Ownership and
 * the request's shape are checked before (assertBookingScope); this guard reads the subscription and rules.
 */
@Injectable()
export class SalesCourse {
  constructor(
    private readonly queries: SalesCourseQueries,
    private readonly scope: SalesBookingScope,
  ) {}

  /**
   * The booking options of an allowed course: { invoiceWaived, endsOn, course }. Throws courseProblem's
   * code (409 subscription_required / custom_count_admin / course_exists, 400 course_mismatch /
   * starts_before_subscription / days_count_mismatch / no_occurrences) or 400 date_in_past (the
   * earliest pick already passed). `req` is a one-student course (assertBookingScope).
   */
  async options(req: BookingRequest): Promise<PrepareOptions> {
    const studentId = 'studentIds' in req ? (req.studentIds[0] ?? '') : '';
    const now = new Date();
    if (req.startsAt && Date.parse(req.startsAt) < now.getTime()) throw domainError(HttpStatus.BAD_REQUEST, 'date_in_past');
    const [sub, rules, rows] = await Promise.all([
      this.queries.subscription(studentId),
      this.queries.rules(studentId),
      this.queries.courseRules(studentId),
    ]);
    const booked = await this.booked(sub);
    const endsOn = sub && plannedCourseEnd({ rule: { ...req, single: false }, now, lessonsTotal: sub.lessons_total });
    const bad = courseProblem({ req, sub, rules, endsOn, booked });
    if (bad) throw domainError(bad.status, bad.code);
    if (!sub) throw domainError(HttpStatus.CONFLICT, 'subscription_required');
    // The audit names the course it follows (a renewal, «تابِع بنفس الأيام»), whichever days were picked.
    const { previous } = courseFacts({ rows, now, subscriptionId: sub.id, booked });
    const course = { package: sub.package, subscriptionId: sub.id, follows: previous?.subscriptionId ?? null };
    return { invoiceWaived: true, endsOn, course };
  }

  /** A retry of a course this clientRequestId already booked (review m6): replayed before the guard. */
  async isReplay(req: BookingRequest): Promise<boolean> {
    return req.clientRequestId ? this.queries.requested(req.clientRequestId) : false;
  }

  /**
   * GET /sales/booking/course: the student, the subscription to book, its days a week, why not (blocked),
   * the previous course a renewal may continue (owner 2026-10-18) and the running course she may change.
   * A previous course still running does not block: the new one starts after its last day (the guard's
   * rule). 403 not_your_student unless the student is hers, whatever sales_auto_assign says.
   */
  async view(studentId: string, user: AuthUser): Promise<SalesCourseView> {
    assertOwnStudents([studentId], await this.scope.owned(user));
    const student = await this.queries.student(studentId);
    const [sub, rules, rows] = await Promise.all([
      this.queries.subscription(studentId),
      this.queries.rules(studentId),
      this.queries.courseRules(studentId),
    ]);
    const now = new Date();
    const today = wallParts(now.toISOString(), student.tz).date;
    const booked = await this.booked(sub);
    const { previous, current } = courseFacts({ rows, now, subscriptionId: sub?.id ?? null, booked });
    const after = previous ? addLocalDays(previous.endsOn, 1) : today;
    const from = after > today ? after : today;
    return {
      student,
      subscription: sub,
      perWeek: sub && courseDaysPerWeek(sub),
      blocked: courseBlock({ sub, rules, today: from, booked }),
      previous,
      current,
    };
  }

  private booked(sub: CourseSubscription | null): Promise<boolean> {
    return sub ? this.queries.subscriptionBooked(sub.id) : Promise.resolve(false);
  }
}
