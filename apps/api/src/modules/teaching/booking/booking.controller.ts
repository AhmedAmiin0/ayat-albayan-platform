import { bookingRoutes } from '@ab/shared';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { clientRequest } from './core/booking.payload';
import { BookingService } from './core/booking.service';
import { SlotsService } from './plan/slots.service';
import { TeacherOptionsService } from './teacher/teacher-options.service';

type Input<K extends keyof typeof bookingRoutes> = RouteInputOf<(typeof bookingRoutes)[K]>;

/** Booking wizard API (R-SCH-06, R-SCH-04, R-LEAD-06; docs/10 §5 #12–14). Admin only. */
@ApiTags('booking')
@ApiBearerAuth()
@Permissions('booking.write')
@Controller()
export class BookingController {
  constructor(
    private readonly teachers: TeacherOptionsService,
    private readonly slotsService: SlotsService,
    private readonly booking: BookingService,
  ) {}

  @Route(bookingRoutes.teachers)
  teacherOptions(@RouteInput() { query }: Input<'teachers'>) {
    return this.teachers.list(query);
  }

  @Route(bookingRoutes.slots)
  slots(@RouteInput() { query }: Input<'slots'>) {
    return this.slotsService.slots(query);
  }

  @Route(bookingRoutes.outsideSlots)
  outsideSlots(@RouteInput() { query }: Input<'outsideSlots'>) {
    return this.slotsService.outside(query);
  }

  @Route(bookingRoutes.check)
  @HttpCode(200)
  async check(@RouteInput() { body }: Input<'check'>) {
    return { conflicts: await this.booking.check(body) };
  }

  @Route(bookingRoutes.book)
  book(@RouteInput() { body }: Input<'book'>, @CurrentUser() user: AuthUser) {
    return this.booking.book(clientRequest(body, user.role), user.id);
  }
}
