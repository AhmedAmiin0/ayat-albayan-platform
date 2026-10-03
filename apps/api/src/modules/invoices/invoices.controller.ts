import type { InvoiceView, SignedDownload } from '@ab/shared';
import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Roles } from '../../common/auth/decorators';
import { parseOrThrow } from '../teachers/http';
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
  constructor(private readonly invoices: InvoicesService) {}

  /** `?ruleId=` (one booking) or `?studentId=` (all of a student's bookings); exactly one. */
  @Get()
  list(@Query() query: unknown): Promise<InvoiceView[]> {
    return this.invoices.list(parseOrThrow(listQuery, query));
  }

  @Get(':id/download')
  download(@Param('id', ParseUUIDPipe) id: string): Promise<SignedDownload> {
    return this.invoices.download(id);
  }
}
