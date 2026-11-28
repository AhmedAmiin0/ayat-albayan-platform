import { salesBookingRoutes } from '@ab/shared';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { clientRequest } from '@/modules/teaching/booking/core/booking.payload';
import { SalesBookingService } from './sales-booking.service';

type Input<K extends keyof typeof salesBookingRoutes> = RouteInputOf<
  (typeof salesBookingRoutes)[K]
>;

/**
 * Registration by the assistant (R-ASST-01): the booking wizard's check and book, scoped to their
 * own leads and students while SalesOwnershipRule enforces it (sales-booking.ownership.ts), with
 * them as the actor so they are recorded as the one who brought the student. Trials only: no
 * price, no invoice, no custom meeting link (assertBookingScope), whatever the switch.
 */
@ApiBearerAuth()
@Controller()
export class SalesBookingController {
  constructor(private readonly booking: SalesBookingService) {}

  @Route(salesBookingRoutes.check)
  @HttpCode(200)
  async check(@RouteInput() { body }: Input<'check'>, @CurrentUser() user: AuthUser) {
    return { conflicts: await this.booking.check(body, user) };
  }

  /** Rule enforced only: 403 not_your_lead | not_your_student | not_your_family. */
  @Route(salesBookingRoutes.book)
  book(@RouteInput() { body }: Input<'book'>, @CurrentUser() user: AuthUser) {
    return this.booking.book(clientRequest(body, user.role), user);
  }
}
