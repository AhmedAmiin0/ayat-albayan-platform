import { courseDaysPerWeek, courseEndsOn, timeGroups, wallParts, type BookingRequest, type SalesCourseView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/verify-token';
import { domainError } from './booking.errors';
import type { PrepareOptions } from './booking.planner';
import { SalesBookingScope } from './sales-booking.ownership';
import { assertOwnStudents } from './sales-booking.scope';
import { SalesCourseQueries } from './sales-course.queries';
import { courseBlock, courseProblem } from './sales-course.rules';

/**
 * The assistant books the weekly course of the subscription she sold (owner 2026-10-18, R-ASST-01,
 * R-ASST-04): exactly lessons_total lessons (every rule ends on courseEndsOn), the plan's days a week,
 * no invoice (the transfer is recorded on the subscription). Ownership and the request's shape are
 * checked before (assertBookingScope); this guard reads the student's subscription and rules.
 */
@Injectable()
export class SalesCourse {
  constructor(
    private readonly queries: SalesCourseQueries,
    private readonly scope: SalesBookingScope,
  ) {}

  /**
   * The booking options of an allowed course: { invoiceWaived, endsOn }. Throws courseProblem's code
   * (409 subscription_required / custom_count_admin / course_exists, 400 course_mismatch /
   * starts_before_subscription / days_count_mismatch). `req` is a one-student course (assertBookingScope).
   */
  async options(req: BookingRequest): Promise<PrepareOptions> {
    const studentId = 'studentIds' in req ? (req.studentIds[0] ?? '') : '';
    const [sub, rules] = await Promise.all([this.queries.subscription(studentId), this.queries.rules(studentId)]);
    const endsOn = sub && courseEndsOn({ groups: timeGroups(req), startsOn: req.startsOn, lessonsTotal: sub.lessons_total });
    const bad = courseProblem({ req, sub, rules, endsOn });
    if (bad) throw domainError(bad.status, bad.code);
    return { invoiceWaived: true, endsOn };
  }

  /**
   * GET /sales/booking/course: the student, the subscription to book, its days a week and why not (blocked).
   * 403 not_your_student unless the student is hers, whatever sales_auto_assign says (like the course itself).
   */
  async view(studentId: string, user: AuthUser): Promise<SalesCourseView> {
    assertOwnStudents([studentId], await this.scope.owned(user));
    const student = await this.queries.student(studentId);
    const [sub, rules] = await Promise.all([this.queries.subscription(studentId), this.queries.rules(studentId)]);
    const today = wallParts(new Date().toISOString(), student.tz).date;
    return {
      student,
      subscription: sub,
      perWeek: sub && courseDaysPerWeek(sub),
      blocked: courseBlock({ sub, rules, today }),
    };
  }
}
