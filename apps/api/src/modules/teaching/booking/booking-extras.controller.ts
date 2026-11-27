import { bookingExtraRoutes as routes } from '@ab/shared';
import { uploadMaxBytes } from '@ab/settings';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '@/common/auth/decorators';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { BookingInvoices } from './invoice/booking.invoice';
import { BookingSettings } from './booking.settings';
import { MakeupCandidates } from './core/makeup/makeup-candidates.service';

/** The invoice and the makeup half of the booking wizard API (R-PAY-03, R-SCH-10). Admin only. */
@ApiTags('booking')
@ApiBearerAuth()
@Permissions('booking.write')
@Controller()
export class BookingExtrasController {
  constructor(
    private readonly invoices: BookingInvoices,
    private readonly makeup: MakeupCandidates,
    private readonly settings: BookingSettings,
  ) {}

  @Route(routes.makeupCandidates)
  makeupCandidates(@RouteInput() { query }: RouteInputOf<typeof routes.makeupCandidates>) {
    return this.makeup.list(query.studentId);
  }

  @Route(routes.invoiceUploadUrl)
  @HttpCode(200)
  async invoiceUploadUrl(@RouteInput() { body }: RouteInputOf<typeof routes.invoiceUploadUrl>) {
    return this.invoices.uploadUrl(body, uploadMaxBytes(await this.settings.read()));
  }
}
