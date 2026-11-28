import type { InvoiceView } from '@ab/schedule';
import { invoiceRoutes as routes, type InvoiceRecentPage, type SignedDownload } from '@ab/shared';
import { Controller } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { recentFilter } from './invoices.dto';
import { InvoicesService } from './invoices.service';
import { InvoicesSettings } from './invoices.settings';

/** Invoices of bookings (R-PAY-03). Admin only: a teacher never sees a payment proof (rule 9). */
@ApiBearerAuth()
@Controller()
export class InvoicesController {
  constructor(
    private readonly invoices: InvoicesService,
    private readonly settings: InvoicesSettings,
  ) {}

  @Route(routes.list)
  list(@RouteInput() { query }: RouteInputOf<typeof routes.list>): Promise<InvoiceView[]> {
    return this.invoices.list(query);
  }

  @Route(routes.recent)
  async recent(
    @RouteInput() { query }: RouteInputOf<typeof routes.recent>,
  ): Promise<InvoiceRecentPage> {
    const { academy_timezone: tz } = await this.settings.read();
    return this.invoices.recent(recentFilter(query, tz));
  }

  @Route(routes.download)
  download(
    @RouteInput() { params }: RouteInputOf<typeof routes.download>,
  ): Promise<SignedDownload> {
    return this.invoices.download(params.id);
  }
}
