import {
  bookingRequestSchema,
  invoiceUploadSchema,
  uploadMaxBytes,
  type BookingResult,
  type BookingTeacherOption,
  type Conflict,
  type SignedUpload,
  type SlotsResponse,
} from '@ab/shared';
import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { SettingsService } from '../../common/settings/settings.service';
import { parseOrThrow } from '../teachers/http';
import { slotsQuerySchema, teacherOptionsQuerySchema } from './booking.dto';
import { BookingInvoices } from './booking.invoice';
import { SalesBookingOptions, SalesBookingService } from './sales-booking.service';
import { withPackageSize } from './package-size';

/**
 * Registration by the assistant (R-ASST-01): the booking wizard's check and book, scoped to their own leads
 * and students (sales-booking.scope.ts), with them as the actor so they are recorded as the one who brought
 * the student. A trial needs no invoice; a package's goes through the upload URL here.
 */
@ApiTags('booking')
@ApiBearerAuth()
@Permissions('self.sales')
@Controller('sales/booking')
export class SalesBookingController {
  constructor(
    private readonly booking: SalesBookingService,
    private readonly invoices: BookingInvoices,
    private readonly settings: SettingsService,
  ) {}

  /** 200 { conflicts } of the whole series, nothing written. */
  @Post('check')
  @HttpCode(200)
  async check(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<{ conflicts: Conflict[] }> {
    const req = parseOrThrow(bookingRequestSchema, withPackageSize(body));
    return { conflicts: await this.booking.check(req, user) };
  }

  /** 201 BookingResult; 403 not_your_lead | not_your_student | not_your_family | override_not_allowed | kind_not_allowed. */
  @Post()
  book(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<BookingResult> {
    return this.booking.book(parseOrThrow(bookingRequestSchema, withPackageSize(body)), user);
  }

  @Post('invoice-upload-url')
  @HttpCode(200)
  async invoiceUploadUrl(@Body() body: unknown): Promise<SignedUpload> {
    const input = parseOrThrow(invoiceUploadSchema, body);
    return this.invoices.uploadUrl(input, uploadMaxBytes(await this.settings.all()));
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
