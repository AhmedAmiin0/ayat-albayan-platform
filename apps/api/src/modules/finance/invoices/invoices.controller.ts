import type { InvoiceView, SignedDownload } from '@ab/shared';
import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Permissions } from '../../../common/auth/decorators';
import { parseOrThrow } from '../../../common/http/http';
import { invoiceRecentQuery, recentFilter } from './invoices.dto';
import { InvoicesService } from './invoices.service';
import { InvoicesSettings } from './invoices.settings';

const listQuery = z
  .object({ ruleId: z.uuid().optional(), studentId: z.uuid().optional() })
  .refine((q) => (q.ruleId === undefined) !== (q.studentId === undefined), { message: 'rule_or_student', path: ['ruleId'] });

/** Invoices of bookings (R-PAY-03). Admin only: a teacher never sees a payment proof (rule 9). */
@ApiTags('invoices')
@ApiBearerAuth()
@Permissions('invoices.read')
@Controller('invoices')
export class InvoicesController {
  constructor(
    private readonly invoices: InvoicesService,
    private readonly settings: InvoicesSettings,
  ) {}

  /** `?ruleId=` (one booking) or `?studentId=` (all of a student's bookings); exactly one. */
  @Get()
  list(@Query() query: unknown): Promise<InvoiceView[]> {
    return this.invoices.list(parseOrThrow(listQuery, query));
  }

  /** `?from&to` (Riyadh days, inclusive) `&kind&student&sort&dir&page&pageSize`: newest first by default. */
  @Get('recent')
  async recent(@Query() query: unknown) {
    const { academy_timezone: tz } = await this.settings.read();
    return this.invoices.recent(recentFilter(parseOrThrow(invoiceRecentQuery, query), tz));
  }

  @Get(':id/download')
  download(@Param('id', ParseUUIDPipe) id: string): Promise<SignedDownload> {
    return this.invoices.download(id);
  }
}
