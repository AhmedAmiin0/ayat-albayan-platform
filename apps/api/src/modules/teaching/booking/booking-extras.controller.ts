import { invoiceUploadSchema, uploadMaxBytes, type MakeupCandidate, type SignedUpload } from '@ab/shared';
import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../../common/auth/decorators';
import { parseOrThrow } from '../../../common/http/http';
import { makeupCandidatesQuery } from './booking.dto';
import { BookingInvoices } from './invoice/booking.invoice';
import { BookingSettings } from './booking.settings';
import { MakeupCandidates } from './makeup/makeup-candidates.service';

/** The invoice and the makeup half of the booking wizard API (R-PAY-03, R-SCH-10). Admin only. */
@ApiTags('booking')
@ApiBearerAuth()
@Permissions('booking.write')
@Controller('booking')
export class BookingExtrasController {
  constructor(
    private readonly invoices: BookingInvoices,
    private readonly makeup: MakeupCandidates,
    private readonly settings: BookingSettings,
  ) {}

  /** R-SCH-10: the student's missed lessons that a «حجز تعويضي» can replace. */
  @Get('makeup-candidates')
  makeupCandidates(@Query() query: unknown): Promise<MakeupCandidate[]> {
    return this.makeup.list(parseOrThrow(makeupCandidatesQuery, query).studentId);
  }

  /** R-PAY-03: a signed PUT for the invoice file; register its path in POST /booking `invoice`. */
  @Post('invoice-upload-url')
  @HttpCode(200)
  async invoiceUploadUrl(@Body() body: unknown): Promise<SignedUpload> {
    const input = parseOrThrow(invoiceUploadSchema, body);
    return this.invoices.uploadUrl(input, uploadMaxBytes(await this.settings.read()));
  }
}
