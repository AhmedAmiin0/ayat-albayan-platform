import {
  bookingRequestSchema,
  type BookingResult,
  type BookingTeacherOption,
  type SlotsResponse,
} from '@ab/shared';
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { parseOrThrow } from '../teachers/http';
import { slotsQuerySchema, teacherOptionsQuerySchema } from './booking.dto';
import { BookingService } from './booking.service';
import { withPackageSize } from './package-size';
import { SlotsService } from './slots.service';
import { TeacherOptionsService } from './teacher-options.service';

/** Booking wizard API (R-SCH-06, R-SCH-04, R-LEAD-06; docs/10 §5 #12–14). Admin only. */
@ApiTags('booking')
@ApiBearerAuth()
@Roles('admin')
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

  /** 201 BookingResult; 409 { code: 'conflict', conflicts } unless override.reason is given. */
  @Post()
  book(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<BookingResult> {
    const req = parseOrThrow(bookingRequestSchema, withPackageSize(body));
    return this.booking.book(req, user.id);
  }
}
