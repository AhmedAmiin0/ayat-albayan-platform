import type { BookingRequest, Conflict, TrialDateResult, TrialHistory } from '@ab/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { AuthUser } from '@/common/auth/verify-token';
import { badRequest } from '@/common/http/errors';
import { domainError } from '@/modules/teaching/booking/booking.errors';
import { SalesBookingScope } from '@/modules/teaching/booking/sales/booking/sales-booking.ownership';
import { assertBookingScope, assertOwnStudents, type BookingOwnership } from '@/modules/teaching/booking/sales/booking/sales-booking.scope';
import { TrialDates } from '@/modules/teaching/booking/trial-date/trial-date.service';
import type { TrialTarget } from '@/modules/teaching/booking/trial-date/trial-date.target';

/**
 * An assistant's own meeting link for the trial she moves (owner 2026-11-02, «update student
 * booking»): https only; anything else is 400 meeting_link_invalid. Absent = the teacher's link.
 */
const salesLinkSchema = z.url({ protocol: /^https$/ }).nullish();

/** The booking scope's checks without the link: a trial DATE may carry her https link. */
const withoutLink = (req: BookingRequest): BookingRequest => ({ ...req, meetingLink: null });

/**
 * «موعد تجريبي جديد» for an assistant (R-ASST-01, owner 2026-10-25): the same scope as her trial
 * booking (SalesBookingScope: her own families' students while SalesOwnershipRule enforces it, any
 * otherwise), never over a clash, never an invoice, never a time already past. Unlike a new booking
 * she may set the trial's meeting link (https, owner 2026-11-02). A move books the trial's own
 * students: each of them must be hers too. 403 not_your_student / override_not_allowed; 400
 * date_in_past / meeting_link_invalid; the rest as TrialDates.
 */
@Injectable()
export class SalesTrialDates {
  constructor(
    private readonly scope: SalesBookingScope,
    private readonly dates: TrialDates,
  ) {}

  async history(studentId: string, user: AuthUser): Promise<TrialHistory> {
    assertOwnStudents([studentId], await this.scope.of(user));
    return this.dates.history(studentId);
  }

  async check(req: BookingRequest, user: AuthUser): Promise<Conflict[]> {
    return this.dates.check(await this.target(req, await this.allowed(req, user)));
  }

  async pick(req: BookingRequest, user: AuthUser): Promise<TrialDateResult> {
    const own = await this.allowed(req, user);
    if (req.startsAt && Date.parse(req.startsAt) < Date.now()) throw domainError(HttpStatus.BAD_REQUEST, 'date_in_past');
    const first = await this.dates.replay(req, user.id);
    if (first) return first;
    return this.dates.pick(await this.target(req, own), user.id);
  }

  private async allowed(req: BookingRequest, user: AuthUser): Promise<BookingOwnership> {
    if (!salesLinkSchema.safeParse(req.meetingLink).success) throw badRequest('meeting_link_invalid');
    const own = await this.scope.of(user);
    assertBookingScope(withoutLink(req), own);
    return own;
  }

  private async target(req: BookingRequest, own: BookingOwnership): Promise<TrialTarget> {
    const target = await this.dates.target(req);
    assertOwnStudents(target.req.studentIds, own);
    return target;
  }
}
