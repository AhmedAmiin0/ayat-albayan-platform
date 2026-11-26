import type { BookingRequest, TrialDateResult, TrialHistory } from '@ab/shared';
import type { Conflict } from '@ab/schedule';
import { HttpStatus, Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { AuthUser } from '@/common/auth/verify-token';
import { badRequest, httpError } from '@/common/http/errors';
import { SalesBookingScope } from '@/modules/teaching/booking/sales/booking/sales-booking.ownership';
import { assertBookingScope, assertOwnStudents, type BookingOwnership } from '@/modules/teaching/booking/sales/booking/sales-booking.scope';
import { TrialDates } from '@/modules/teaching/booking/trial-date/trial-date.service';
import type { TrialTarget } from '@/modules/teaching/booking/trial-date/trial-date.target';

/**
 * An assistant's own meeting link for the trial she moves: https only; anything else is 400
 * meeting_link_invalid. Absent = the teacher's link.
 */
const salesLinkSchema = z
  .url({ protocol: /^https$/ })
  .regex(/^https:\/\/[^/\s]+/) // a real host after «https://» (not «https:x» or «https:/x»)
  .nullish();

/** The booking scope's checks without the link: a trial DATE may carry her https link. */
const withoutLink = (req: BookingRequest): BookingRequest => ({ ...req, meetingLink: null });

/** R-ASST-01: her scope, never over a clash, an invoice or a past time. */
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
    if (req.startsAt && Date.parse(req.startsAt) < Date.now()) throw httpError(HttpStatus.BAD_REQUEST, 'date_in_past');
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
