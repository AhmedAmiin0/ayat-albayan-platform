import { addLocalDays, courseDaysPerWeek, courseLessonCount, wallParts, type BookingRequest, type CourseSubscription, type SalesCourseView } from '@ab/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { can } from '@/common/auth/permissions';
import type { AuthUser } from '@/common/auth/verify-token';
import { plannedCourseEnd } from '@/modules/teaching/booking/core/booking.course-end';
import { courseFacts } from '@/modules/teaching/booking/core/course-read';
import { domainError } from '@/modules/teaching/booking/booking.errors';
import type { PrepareOptions } from '@/modules/teaching/booking/plan/booking.planner';
import { SalesBookingScope } from '@/modules/teaching/booking/sales/booking/sales-booking.ownership';
import { assertOwnStudents } from '@/modules/teaching/booking/sales/booking/sales-booking.scope';
import { CourseDraftRepo } from '@/modules/teaching/booking/sales/course-draft/course-draft.repo';
import { draftCourse } from '@/modules/teaching/booking/sales/course-draft/course-draft.rules';
import { SalesCourseRepo } from './sales-course.repo';
import { courseBlock, courseProblem } from './sales-course.rules';

/**
 * The assistant books the weekly course of the subscription she sold (owner 2026-10-18, R-ASST-01,
 * R-ASST-04): exactly lessons_total − lessons_used_before lessons (courseLessonCount, owner 2026-10-28;
 * every rule ends on plannedCourseEnd), the plan's days a
 * week, no invoice (the transfer is recorded on the subscription), the subscription's own package and
 * one course per subscription (every rule carries its subscription_id, migration 470). Ownership and
 * the request's shape are checked before (assertBookingScope); this guard reads the subscription and rules.
 */
@Injectable()
export class SalesCourse {
  constructor(
    private readonly queries: SalesCourseRepo,
    private readonly scope: SalesBookingScope,
    private readonly drafts: CourseDraftRepo,
  ) {}

  /**
   * The booking options of an allowed course: { invoiceWaived, endsOn, course }. Throws courseProblem's
   * code (409 subscription_required / custom_count_admin / course_exists, 400 course_mismatch /
   * starts_before_subscription / days_count_mismatch / no_occurrences) or 400 date_in_past (the
   * earliest pick already passed). `req` is a one-student course (assertBookingScope); `only` books
   * that package (a draft on its payment) instead of the one the wizard would pick.
   */
  async options(req: BookingRequest, only?: string): Promise<PrepareOptions> {
    const studentId = 'studentIds' in req ? (req.studentIds[0] ?? '') : '';
    const now = new Date();
    if (req.startsAt && Date.parse(req.startsAt) < now.getTime()) throw domainError(HttpStatus.BAD_REQUEST, 'date_in_past');
    const [sub, rules, rows] = await Promise.all([
      this.queries.subscription(studentId, only),
      this.queries.rules(studentId),
      this.queries.courseRules(studentId),
    ]);
    const booked = await this.booked(sub);
    const endsOn = sub && plannedCourseEnd({ rule: { ...req, single: false }, now, lessonsTotal: courseLessonCount(sub) });
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
   * rule). 403 not_your_student unless the student is hers while SalesOwnershipRule enforces
   * it; ANY student with sales.renew_any (owner 2026-11-01, docs/16 row 38) or while it does not.
   */
  async view(studentId: string, user: AuthUser): Promise<SalesCourseView> {
    if (!can(user, 'sales.renew_any')) assertOwnStudents([studentId], await this.scope.of(user));
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
    const held = await this.holdOf(sub);
    return {
      student,
      subscription: sub,
      perWeek: sub && courseDaysPerWeek(sub),
      blocked: courseBlock({ sub, rules, today: from, booked }),
      previous: previous ?? held.prefill,
      current,
      hold: held.hold,
      draft: held.draft,
    };
  }

  /**
   * Hold mode and the draft (owner 2026-11-06): unpaid with an open link → «احجز» saves a draft;
   * a saved draft comes back as `previous` too, so every wizard prefills its picks.
   */
  private async holdOf(sub: CourseSubscription | null) {
    if (!sub) return { hold: false, draft: null, prefill: null };
    const [hold, draft] = await Promise.all([this.drafts.held(sub.id), this.drafts.get(sub.id)]);
    const prefill = draft ? draftCourse(draft.request, sub) : null;
    return { hold, draft: draft ? { saved_at: draft.savedAt } : null, prefill };
  }

  private booked(sub: CourseSubscription | null): Promise<boolean> {
    return sub ? this.queries.subscriptionBooked(sub.id) : Promise.resolve(false);
  }
}
