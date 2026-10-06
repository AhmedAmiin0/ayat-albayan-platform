import type { BookingRequest, BookingResult, BookingTeacherOption, Conflict, SlotsResponse } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/verify-token';
import type { SalesOwnership } from '../sales/sales-ownership';
import { SalesQueries } from '../sales/sales.queries';
import type { SlotsQuery, TeacherOptionsQuery } from './booking.dto';
import { BookingService } from './booking.service';
import { assertBookingScope, assertOwnStudents, scopeDuplicates } from './sales-booking.scope';
import { SlotsService } from './slots.service';
import { TeacherOptionsService } from './teacher-options.service';

/**
 * The booking wizard for an assistant (R-ASST-01): the same planner, conflict check and create_booking
 * transaction as the admin's, with the assistant as the actor, so the new student's created_by is her and
 * the students trigger (migration 270) records brought_by / brought_at. Scope: sales-booking.scope.ts.
 */
@Injectable()
export class SalesBookingService {
  constructor(
    private readonly sales: SalesQueries,
    private readonly booking: BookingService,
  ) {}

  async check(req: BookingRequest, user: AuthUser): Promise<Conflict[]> {
    const own = await this.sales.ownership(user.id);
    assertBookingScope(req, own);
    return this.scoped(own, () => this.booking.check(req));
  }

  /** 201 BookingResult; 409 conflict (never overridden) or duplicate_student; 403 not_your_lead / not_your_student / not_your_family. */
  async book(req: BookingRequest, user: AuthUser): Promise<BookingResult> {
    const own = await this.sales.ownership(user.id);
    assertBookingScope(req, own);
    return this.scoped(own, () => this.booking.book(req, user.id));
  }

  private async scoped<T>(own: SalesOwnership, run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (e) {
      throw e instanceof Error ? scopeDuplicates(e, own) : e;
    }
  }
}

/** The wizard's two reads for an assistant: the same teachers and slots as the admin's, naming only her own students. */
@Injectable()
export class SalesBookingOptions {
  constructor(
    private readonly sales: SalesQueries,
    private readonly teachers: TeacherOptionsService,
    private readonly slotsService: SlotsService,
  ) {}

  /** Without the teachers' meeting links (the room is entered through the API). */
  async teacherOptions(q: TeacherOptionsQuery, user: AuthUser): Promise<BookingTeacherOption[]> {
    if (q.studentId) assertOwnStudents([q.studentId], await this.sales.ownership(user.id));
    return (await this.teachers.list(q)).map((t) => ({ ...t, meeting_link: null }));
  }

  /** `excludeLessonId` (moving a lesson) is the admin's; it is dropped. */
  async slots(q: SlotsQuery, user: AuthUser): Promise<SlotsResponse> {
    if (q.studentIds?.length) assertOwnStudents(q.studentIds, await this.sales.ownership(user.id));
    return this.slotsService.slots({ ...q, excludeLessonId: undefined });
  }
}
