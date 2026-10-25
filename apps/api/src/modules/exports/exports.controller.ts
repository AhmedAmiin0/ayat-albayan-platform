import { monthQuery, PAYMENT_KINDS, PAYMENT_METHODS } from '@ab/shared';
import { z } from 'zod';
import { parseOrThrow } from '../../common/http/http';
import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../common/auth/decorators';
import { parseRange } from '../dashboard/range';
import { badRequest } from '../../common/http/errors';
import { attachment } from './csv';
import { ExportsService, type CsvFile } from './exports.service';

/** The bit of the Fastify reply used here (no direct `fastify` dependency). */
interface HeaderReply {
  header(name: string, value: string): unknown;
}

function send(reply: HeaderReply, file: CsvFile): string {
  reply.header('Content-Type', 'text/csv; charset=utf-8');
  reply.header('Content-Disposition', attachment(file.filename));
  // Cross-origin web app (WEB_ORIGIN): let it read the file name.
  reply.header('Access-Control-Expose-Headers', 'Content-Disposition');
  return file.csv;
}

const paymentFilter = z.object({
  studentId: z.uuid().optional(),
  method: z.enum(PAYMENT_METHODS).optional(),
  kind: z.enum(PAYMENT_KINDS).optional(),
});

/** CSV exports (R-RPT-03, R-TCH-04). Admin only. `/payouts/:month.csv` can't be routed in Fastify. */
@ApiTags('exports')
@ApiBearerAuth()
@Permissions('exports.read')
@Controller('exports')
export class ExportsController {
  constructor(private readonly exports: ExportsService) {}

  @Get('students.csv')
  async students(@Res({ passthrough: true }) reply: HeaderReply) {
    return send(reply, await this.exports.students());
  }

  @Get('lessons.csv')
  async lessons(@Query() query: unknown, @Res({ passthrough: true }) reply: HeaderReply) {
    return send(reply, await this.exports.lessons(parseRange(query)));
  }

  @Get('payments.csv')
  async payments(@Query() query: unknown, @Res({ passthrough: true }) reply: HeaderReply) {
    return send(reply, await this.exports.payments(parseRange(query), parseOrThrow(paymentFilter, query)));
  }

  /** `?month=YYYY-MM` → 400 invalid_month otherwise. */
  @Get('payouts.csv')
  async payouts(@Query() query: unknown, @Res({ passthrough: true }) reply: HeaderReply) {
    const parsed = monthQuery.safeParse(query);
    if (!parsed.success) throw badRequest('invalid_month');
    return send(reply, await this.exports.payouts(parsed.data.month));
  }
}
