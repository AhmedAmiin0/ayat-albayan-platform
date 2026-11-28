import type { BookingRequest } from '@ab/shared';
import { bookingKindOf, type BookingResult, type Conflict } from '@ab/schedule';
import { HttpStatus, Injectable } from '@nestjs/common';
import { can } from '@/common/auth/permissions';
import type { AuthUser } from '@/common/auth/verify-token';
import { ar } from '@/common/infra/i18n/server-text';
import type { PrepareOptions } from '@/modules/teaching/booking/plan/booking.planner.types';
import { BookingService } from '@/modules/teaching/booking/core/booking.service';
import { SalesBookingScope } from './sales-booking.ownership';
import { SalesCourse } from '@/modules/teaching/booking/sales/course/sales-course.service';
import {
  assertBookingScope,
  scopeDuplicates,
  type BookingOwnership,
  type CourseGrant,
} from './sales-booking.scope';
import { httpError } from '@/common/http/errors';

/**
 * The booking wizard for an assistant (R-ASST-01): the admin's planner, conflict check and
 * create_booking transaction with the assistant as the actor, so the new student's created_by is
 * her and the students trigger (migration 270) records brought_by / brought_at. Scope:
 * sales-booking.scope.ts; ownership only while SalesOwnershipRule enforces it
 * (sales-booking.ownership.ts). A course (kind 'package', self.sales_money) is one student's (hers
 * while enforced, ANY with sales.renew_any) and passes SalesCourse: no invoice, it ends on its N-th
 * lesson; the rules' created_by is her.
 */
@Injectable()
export class SalesBookingService {
  constructor(
    private readonly scope: SalesBookingScope,
    private readonly booking: BookingService,
    private readonly course: SalesCourse,
  ) {}

  async check(req: BookingRequest, user: AuthUser): Promise<Conflict[]> {
    const { own, opts } = await this.allowed(req, user);
    return this.scoped(own, () => this.booking.check(req, opts));
  }

  /**
   * 201 BookingResult; 409 conflict (never overridden) / duplicate_student / course_held (save the
   * draft); 403 (enforced) not_your_lead / not_your_student / not_your_family; 400 date_in_past
   * (a trial's first lesson passed, review M3); a course's codes: SalesCourse.options.
   */
  async book(req: BookingRequest, user: AuthUser): Promise<BookingResult> {
    const own = await this.ownership(req, user);
    const course = bookingKindOf(req) === 'package';
    if (!course && req.startsAt && Date.parse(req.startsAt) < Date.now())
      throw httpError(HttpStatus.BAD_REQUEST, 'date_in_past');
    // A booked course's retry gets that booking back (BookingService replays it), no course_exists.
    if (course && (await this.course.isReplay(req)))
      return this.scoped(own, () => this.booking.book(req, user.id));
    const opts = await this.courseOptions(req);
    await this.assertNotHeld(opts);
    return this.scoped(own, () =>
      opts ? this.booking.book(req, user.id, opts) : this.booking.book(req, user.id),
    );
  }

  /**
   * A held package (unpaid, open link) is never booked before its payment, whatever the client
   * (an old app build, a stale web tab: PR #648 review): 409 course_held, its text in the body.
   */
  private async assertNotHeld(opts: PrepareOptions | undefined): Promise<void> {
    const id = opts?.course?.subscriptionId;
    if (!id || !(await this.course.held(id))) return;
    throw httpError(HttpStatus.CONFLICT, 'course_held', { message: ar.booking.error.course_held });
  }

  /**
   * The scope, then for a course its guard: the options it is booked with (undefined for a trial).
   * Also a course draft's check (CourseDrafts.save).
   */
  async allowed(
    req: BookingRequest,
    user: AuthUser,
  ): Promise<{ own: BookingOwnership; opts?: PrepareOptions }> {
    const own = await this.ownership(req, user);
    const opts = await this.courseOptions(req);
    return opts ? { own, opts } : { own };
  }

  private async ownership(req: BookingRequest, user: AuthUser): Promise<BookingOwnership> {
    const own = await this.scope.of(user);
    assertBookingScope(req, own, courseGrant(user));
    return own;
  }

  private courseOptions(req: BookingRequest): Promise<PrepareOptions | undefined> {
    return bookingKindOf(req) === 'package' ? this.course.options(req) : Promise.resolve(undefined);
  }

  private async scoped<T>(own: BookingOwnership, run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (e) {
      throw e instanceof Error ? scopeDuplicates(e, own) : e;
    }
  }
}

/** self.sales_money: a course of hers; with sales.renew_any of ANY student (docs/16 row 38). */
function courseGrant(user: AuthUser): CourseGrant {
  if (!can(user, 'self.sales_money')) return false;
  return can(user, 'sales.renew_any') ? 'any' : true;
}
