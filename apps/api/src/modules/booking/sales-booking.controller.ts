import { bookingRequestSchema, type BookingResult, type BookingTeacherOption, type Conflict, type SlotsResponse } from '@ab/shared';
import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { parseOrThrow } from '../teachers/http';
import { clientRequest } from './booking.payload';
import { slotsQuerySchema, teacherOptionsQuerySchema } from './booking.dto';
import { SalesBookingOptions, SalesBookingService } from './sales-booking.service';
import { withPackageSize } from './package-size';

/**
 * Registration by the assistant (R-ASST-01): the booking wizard's check and book, scoped to their own leads
 * and students while settings.sales_auto_assign is ON (any lead when it is OFF: sales-booking.ownership.ts),
 * with them as the actor so they are recorded as the one who brought the student. Trials only: no price, no
 * invoice, no custom meeting link (assertBookingScope), whatever the switch.
 */
@ApiTags('booking')
@ApiBearerAuth()
@Permissions('self.sales')
@Controller('sales/booking')
export class SalesBookingController {
  constructor(private readonly booking: SalesBookingService) {}

  /** 200 { conflicts } of the whole series, nothing written. */
  @Post('check')
  @HttpCode(200)
  async check(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<{ conflicts: Conflict[] }> {
    const req = parseOrThrow(bookingRequestSchema, withPackageSize(body));
    return { conflicts: await this.booking.check(req, user) };
  }

  /** 201 BookingResult; 403 override_not_allowed | kind_not_allowed | meeting_link_not_allowed | invoice_not_allowed, and (sales_auto_assign ON only) not_your_lead | not_your_student | not_your_family. */
  @Post()
  book(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<BookingResult> {
    const req = parseOrThrow(bookingRequestSchema, withPackageSize(body));
    return this.booking.book(clientRequest(req, user.role), user);
  }
}

/** The teachers and the slot grid of the assistant's wizard (the admin's GET /booking/teachers and /booking/slots, scoped). */
@ApiTags('booking')
@ApiBearerAuth()
@Permissions('self.sales')
@Controller('sales/booking')
export class SalesBookingOptionsController {
  constructor(private readonly options: SalesBookingOptions) {}

  @Get('teachers')
  teacherOptions(@Query() query: unknown, @CurrentUser() user: AuthUser): Promise<BookingTeacherOption[]> {
    return this.options.teacherOptions(parseOrThrow(teacherOptionsQuerySchema, query), user);
  }

  @Get('slots')
  slots(@Query() query: unknown, @CurrentUser() user: AuthUser): Promise<SlotsResponse> {
    return this.options.slots(parseOrThrow(slotsQuerySchema, query), user);
  }
}
