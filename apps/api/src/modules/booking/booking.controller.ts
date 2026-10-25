import {
  bookingRequestSchema,
  type BookingResult,
  type BookingTeacherOption,
  type Conflict,
  type SlotsResponse,
} from '@ab/shared';
import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { parseOrThrow } from '../../common/http/http';
import { clientRequest } from './core/booking.payload';
import { slotsQuerySchema, teacherOptionsQuerySchema } from './booking.dto';
import { BookingService } from './core/booking.service';
import { withPackageSize } from './plan/package-size';
import { SlotsService } from './plan/slots.service';
import { TeacherOptionsService } from './teacher-options.service';

/** Booking wizard API (R-SCH-06, R-SCH-04, R-LEAD-06; docs/10 §5 #12–14). Admin only. */
@ApiTags('booking')
@ApiBearerAuth()
@Permissions('booking.write')
@Controller('booking')
export class BookingController {
  constructor(
    private readonly teachers: TeacherOptionsService,
    private readonly slotsService: SlotsService,
    private readonly booking: BookingService,
  ) {}

  @Get('teachers')
  teacherOptions(@Query() query: unknown): Promise<BookingTeacherOption[]> {
    return this.teachers.list(parseOrThrow(teacherOptionsQuerySchema, query));
  }

  @Get('slots')
  slots(@Query() query: unknown): Promise<SlotsResponse> {
    return this.slotsService.slots(parseOrThrow(slotsQuerySchema, query));
  }

  /** The same body as POST /booking; 200 { conflicts } of the whole series, nothing written. */
  @Post('check')
  @HttpCode(200)
  async check(@Body() body: unknown): Promise<{ conflicts: Conflict[] }> {
    const req = parseOrThrow(bookingRequestSchema, withPackageSize(body));
    return { conflicts: await this.booking.check(req) };
  }

  /**
   * 201 BookingResult; 409 { code: 'conflict', conflicts } unless override.reason is given; 400
   * invoice_required for any kind but trial without `invoice` (R-PAY-03).
   */
  @Post()
  book(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<BookingResult> {
    const req = parseOrThrow(bookingRequestSchema, withPackageSize(body));
    return this.booking.book(clientRequest(req, user.role), user.id);
  }
}
