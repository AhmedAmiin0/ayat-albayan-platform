import { bookingBodySchema, type BookingRequest, type OutsideSlotsResponse } from '@ab/shared';
import type { BookingResult, BookingTeacherOption, Conflict, SlotsResponse } from '@ab/schedule';
import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody, ZodQuery } from '@/common/http/zod-inputs';
import { clientRequest } from './core/booking.payload';
import { outsideSlotsQuerySchema, slotsQuerySchema, teacherOptionsQuerySchema } from './booking.dto';
import { BookingService } from './core/booking.service';
import { SlotsService } from './plan/slots.service';
import { TeacherOptionsService } from './teacher/teacher-options.service';

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
  teacherOptions(
    @ZodQuery(teacherOptionsQuerySchema) query: z.output<typeof teacherOptionsQuerySchema>,
  ): Promise<BookingTeacherOption[]> {
    return this.teachers.list(query);
  }

  @Get('slots')
  slots(
    @ZodQuery(slotsQuerySchema) query: z.output<typeof slotsQuerySchema>,
  ): Promise<SlotsResponse> {
    return this.slotsService.slots(query);
  }

  /** The next 14 days of the server clock, inside the teacher hours or not. */
  @Get('outside-slots')
  outsideSlots(
    @ZodQuery(outsideSlotsQuerySchema) query: z.output<typeof outsideSlotsQuerySchema>,
  ): Promise<OutsideSlotsResponse> {
    return this.slotsService.outside(query);
  }

  /** The same body as POST /booking; 200 { conflicts } of the whole series, nothing written. */
  @Post('check')
  @HttpCode(200)
  async check(@ZodBody(bookingBodySchema) req: BookingRequest): Promise<{ conflicts: Conflict[] }> {
    return { conflicts: await this.booking.check(req) };
  }

  /**
   * 201 BookingResult; 409 { code: 'conflict', conflicts } unless override.reason is given; 400
   * invoice_required for any kind but trial without `invoice` (R-PAY-03).
   */
  @Post()
  book(
    @ZodBody(bookingBodySchema) req: BookingRequest,
    @CurrentUser() user: AuthUser,
  ): Promise<BookingResult> {
    return this.booking.book(clientRequest(req, user.role), user.id);
  }
}
