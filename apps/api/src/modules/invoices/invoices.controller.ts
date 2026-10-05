import type { InvoiceView, SignedDownload } from '@ab/shared';
import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Roles } from '../../common/auth/decorators';
import { SettingsService } from '../../common/settings/settings.service';
import { parseOrThrow } from '../teachers/http';
import { invoiceRecentQuery, recentFilter } from './invoices.dto';
import { InvoicesService } from './invoices.service';

const listQuery = z
  .object({ ruleId: z.uuid().optional(), studentId: z.uuid().optional() })
  .refine((q) => (q.ruleId === undefined) !== (q.studentId === undefined), { message: 'rule_or_student', path: ['ruleId'] });

/** Invoices of bookings (R-PAY-03). Admin only: a teacher never sees a payment proof (rule 9). */
@ApiTags('invoices')
@ApiBearerAuth()
@Roles('admin')
@Controller('invoices')
export class InvoicesController {
  constructor(
    private readonly invoices: InvoicesService,
    private readonly settings: SettingsService,
  ) {}

  /** `?ruleId=` (one booking) or `?studentId=` (all of a student's bookings); exactly one. */
  @Get()
  list(@Query() query: unknown): Promise<InvoiceView[]> {
    return this.invoices.list(parseOrThrow(listQuery, query));
  }

  /** `?from&to` (Riyadh days, inclusive) `&kind&student&sort&dir&page&pageSize`: newest first by default. */
  @Get('recent')
  async recent(@Query() query: unknown) {
    const { academy_timezone: tz } = await this.settings.all();
    return this.invoices.recent(recentFilter(parseOrThrow(invoiceRecentQuery, query), tz));
  }

  @Get(':id/download')
  download(@Param('id', ParseUUIDPipe) id: string): Promise<SignedDownload> {
    return this.invoices.download(id);
  }
}
