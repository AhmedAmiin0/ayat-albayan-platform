import { exportRoutes as routes, paymentExportFilterSchema } from '@ab/shared';
import { parseOrThrow } from '@/common/http/http';
import { Controller, Query, Res } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Route } from '@/common/http/route';
import { parseRange } from '@/modules/reporting/dashboard/range';
import { badRequest } from '@/common/http/errors';
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

/**
 * CSV exports (R-RPT-03, R-TCH-04). `/payouts/:month.csv` can't be routed in Fastify. The range
 * and month keep their own 400 codes, which @RouteInput() would answer as validation_failed.
 */
@ApiBearerAuth()
@Controller()
export class ExportsController {
  constructor(private readonly exports: ExportsService) {}

  @Route(routes.students)
  async students(@Res({ passthrough: true }) reply: HeaderReply) {
    return send(reply, await this.exports.students());
  }

  @Route(routes.lessons)
  async lessons(@Query() query: unknown, @Res({ passthrough: true }) reply: HeaderReply) {
    return send(reply, await this.exports.lessons(parseRange(query)));
  }

  @Route(routes.payments)
  async payments(@Query() query: unknown, @Res({ passthrough: true }) reply: HeaderReply) {
    const filter = parseOrThrow(paymentExportFilterSchema, query);
    return send(reply, await this.exports.payments(parseRange(query), filter));
  }

  @Route(routes.payouts)
  async payouts(@Query() query: unknown, @Res({ passthrough: true }) reply: HeaderReply) {
    const parsed = routes.payouts.query.safeParse(query);
    if (!parsed.success) throw badRequest('invalid_month');
    return send(reply, await this.exports.payouts(parsed.data.month));
  }
}
