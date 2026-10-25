import { bookingKindOf, type BookingRequest, type BookingResult, type BookingTeacherOption, type Conflict, type SlotsResponse } from '@ab/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { can } from '../../common/auth/permissions';
import type { AuthUser } from '../../common/auth/verify-token';
import { domainError } from './booking.errors';
import type { PrepareOptions } from './plan/booking.planner';
import type { SlotsQuery, TeacherOptionsQuery } from './booking.dto';
import { BookingService } from './core/booking.service';
import { SalesBookingScope } from './sales-booking.ownership';
import { SalesCourse } from './sales-course.service';
import { assertBookingScope, assertOwnStudents, scopeDuplicates, type BookingOwnership } from './sales-booking.scope';
import { SlotsService } from './plan/slots.service';
import { TeacherOptionsService } from './teacher/teacher-options.service';

/**
 * The booking wizard for an assistant (R-ASST-01): the same planner, conflict check and create_booking
 * transaction as the admin's, with the assistant as the actor, so the new student's created_by is her and
 * the students trigger (migration 270) records brought_by / brought_at. Scope: sales-booking.scope.ts; for a
 * trial the ownership part only while settings.sales_auto_assign is ON (sales-booking.ownership.ts). A course
 * (kind 'package', self.sales_money, owner 2026-10-18) is always her own student's and passes SalesCourse: it
 * is booked with no invoice and ends on its N-th lesson; the rules' created_by is her.
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
   * 201 BookingResult; 409 conflict (never overridden) or duplicate_student; 403 (ON only, always for a course)
   * not_your_lead / not_your_student / not_your_family; 400 date_in_past (a trial whose first lesson
   * already passed: the planner would book next week's occurrence instead, review M3); a course's codes: SalesCourse.options.
   */
  async book(req: BookingRequest, user: AuthUser): Promise<BookingResult> {
    const own = await this.ownership(req, user);
    const course = bookingKindOf(req) === 'package';
    if (!course && req.startsAt && Date.parse(req.startsAt) < Date.now()) throw domainError(HttpStatus.BAD_REQUEST, 'date_in_past');
    // A retry after a booked course returns that booking (BookingService replays it), not course_exists.
    if (course && (await this.course.isReplay(req))) return this.scoped(own, () => this.booking.book(req, user.id));
    const opts = await this.courseOptions(req);
    return this.scoped(own, () => (opts ? this.booking.book(req, user.id, opts) : this.booking.book(req, user.id)));
  }

  /** The scope, then for a course its guard: the options it is booked with (undefined for a trial). */
  private async allowed(req: BookingRequest, user: AuthUser): Promise<{ own: BookingOwnership; opts?: PrepareOptions }> {
    const own = await this.ownership(req, user);
    const opts = await this.courseOptions(req);
    return opts ? { own, opts } : { own };
  }

  private async ownership(req: BookingRequest, user: AuthUser): Promise<BookingOwnership> {
    const own = await this.scope.forRequest(req, user);
    assertBookingScope(req, own, can(user, 'self.sales_money'));
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

/** The wizard's two reads for an assistant: the same teachers and slots as the admin's, naming only her own students (any while auto-assign is OFF). */
@Injectable()
export class SalesBookingOptions {
  constructor(
    private readonly scope: SalesBookingScope,
    private readonly teachers: TeacherOptionsService,
    private readonly slotsService: SlotsService,
  ) {}

  /** Without the teachers' meeting links (the room is entered through the API); platform_classroom stays. */
  async teacherOptions(q: TeacherOptionsQuery, user: AuthUser): Promise<BookingTeacherOption[]> {
    if (q.studentId) assertOwnStudents([q.studentId], await this.scope.of(user));
    return (await this.teachers.list(q)).map((t) => ({ ...t, meeting_link: null }));
  }

  /**
   * `excludeLessonId` is kept only for a lesson of the grid's own students (her student's trial that
   * «موعد تجريبي جديد» moves); any other is dropped (moving a lesson is the admin's). `excludeCourse`
   * («تغيير أيام الحلقات») frees only her own students' course lessons: those students must be hers whatever the switch.
   */
  async slots(q: SlotsQuery, user: AuthUser): Promise<SlotsResponse> {
    const ids = q.studentIds ?? [];
    if (ids.length) assertOwnStudents(ids, await this.scope.of(user));
    if (q.excludeCourse) assertOwnStudents(ids, await this.scope.owned(user));
    const keep = !!q.excludeLessonId && ids.length > 0 && (await this.scope.ownLesson(q.excludeLessonId, ids));
    return this.slotsService.slots({ ...q, excludeLessonId: keep ? q.excludeLessonId : undefined });
  }
}
