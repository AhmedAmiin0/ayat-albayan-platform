import type { BookingRequest, Conflict, TrialDateResult, TrialHistory } from '@ab/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../../../common/auth/verify-token';
import { domainError } from '../../booking.errors';
import { SalesBookingScope } from '../booking/sales-booking.ownership';
import { assertBookingScope, assertOwnStudents, type BookingOwnership } from '../booking/sales-booking.scope';
import { TrialDates } from '../../trial-date/trial-date.service';
import type { TrialTarget } from '../../trial-date/trial-date.target';

/**
 * «موعد تجريبي جديد» for an assistant (R-ASST-01, owner 2026-10-25): the same scope as her trial
 * booking (SalesBookingScope: her own families' students while settings.sales_auto_assign is ON, any
 * while it is OFF), never over a clash, never a custom link or an invoice, never a time already past.
 * A move books the trial's own students: each of them must be hers too. 403 not_your_student /
 * override_not_allowed / meeting_link_not_allowed; 400 date_in_past; the rest as TrialDates.
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
    const own = await this.scope.of(user);
    assertBookingScope(req, own);
    return own;
  }

  private async target(req: BookingRequest, own: BookingOwnership): Promise<TrialTarget> {
    const target = await this.dates.target(req);
    assertOwnStudents(target.req.studentIds, own);
    return target;
  }
}
