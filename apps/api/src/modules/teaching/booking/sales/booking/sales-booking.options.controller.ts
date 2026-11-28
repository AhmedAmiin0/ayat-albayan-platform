import { salesBookingRoutes } from '@ab/shared';
import { Controller } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { SalesBookingOptions } from './sales-booking-options.service';

type Input<K extends keyof typeof salesBookingRoutes> = RouteInputOf<
  (typeof salesBookingRoutes)[K]
>;

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
