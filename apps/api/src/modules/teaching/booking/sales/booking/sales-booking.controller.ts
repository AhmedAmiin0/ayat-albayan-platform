import { salesBookingRoutes } from '@ab/shared';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { clientRequest } from '@/modules/teaching/booking/core/booking.payload';
import { SalesBookingOptions, SalesBookingService } from './sales-booking.service';

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

/** The teachers and the slot grid of the assistant's wizard: the admin's, scoped. */
@ApiBearerAuth()
@Controller()
export class SalesBookingOptionsController {
  constructor(private readonly options: SalesBookingOptions) {}

  @Route(salesBookingRoutes.teachers)
  teacherOptions(@RouteInput() { query }: Input<'teachers'>, @CurrentUser() user: AuthUser) {
    return this.options.teacherOptions(query, user);
  }

  @Route(salesBookingRoutes.slots)
  slots(@RouteInput() { query }: Input<'slots'>, @CurrentUser() user: AuthUser) {
    return this.options.slots(query, user);
  }

  @Route(salesBookingRoutes.outsideSlots)
  outsideSlots(@RouteInput() { query }: Input<'outsideSlots'>, @CurrentUser() user: AuthUser) {
    return this.options.outsideSlots(query, user);
  }
}
