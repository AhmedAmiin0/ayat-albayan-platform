import { monthParam } from '@ab/shared';
import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Permissions } from '../../common/auth/decorators';
import { rangeWindow, riyadhDate } from '../dashboard/range';
import { ReceivablesService } from '../receivables/receivables.service';
import { parseOrThrow } from '../../common/http/http';
import { attachment, toCsv } from './csv';
import { FinanceExportsQueries } from './finance-exports.queries';
import { expenseCsv, ledgerCsv, receivablesCsv } from './finance.rows';

interface HeaderReply {
  header(name: string, value: string): unknown;
}

function send(reply: HeaderReply, input: { filename: string; rows: Parameters<typeof toCsv>[0] }): string {
  reply.header('Content-Type', 'text/csv; charset=utf-8');
  reply.header('Content-Disposition', attachment(input.filename));
  reply.header('Access-Control-Expose-Headers', 'Content-Disposition');
  return toCsv(input.rows);
}

const yearOrMonth = z.union([z.object({ month: monthParam }), z.object({ year: z.string().regex(/^\d{4}$/, 'invalid_year') })]);
const ledgerQuery = z.object({ month: monthParam, teacherId: z.uuid().optional() });

/** «YYYY-MM» → the Riyadh month as a window (the dashboard's months). */
function monthWindow(month: string) {
  const [y = 0, m = 1] = month.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return rangeWindow({ from: `${month}-01`, to: last });
}

/** Finance CSVs (owner, 2026-10-05): expenses, the teacher ledger, receivables. Admin only. */
@ApiTags('exports')
@ApiBearerAuth()
@Permissions('exports.read')
@Controller('exports')
export class FinanceExportsController {
  constructor(
    private readonly queries: FinanceExportsQueries,
    private readonly receivables: ReceivablesService,
  ) {}

  /** `?month=YYYY-MM` or `?year=YYYY`. */
  @Get('expenses.csv')
  async expenses(@Query() query: unknown, @Res({ passthrough: true }) reply: HeaderReply) {
    const q = parseOrThrow(yearOrMonth, query);
    const [first, last, span] = 'month' in q ? [`${q.month}-01`, `${q.month}-01`, q.month] : [`${q.year}-01-01`, `${q.year}-12-01`, q.year];
    return send(reply, { filename: `expenses-${span}.csv`, rows: expenseCsv(await this.queries.expenses(first, last)) });
  }

  /** `?month=YYYY-MM&teacherId?`: the month's ledger sessions, then the payments made in it. */
  @Get('teacher-ledger.csv')
  async ledger(@Query() query: unknown, @Res({ passthrough: true }) reply: HeaderReply) {
    const { month, teacherId } = parseOrThrow(ledgerQuery, query);
    const w = monthWindow(month);
    const [sessions, payments] = await Promise.all([this.queries.sessions(w, teacherId), this.queries.teacherPayments(w, teacherId)]);
    return send(reply, { filename: `teacher-ledger-${month}.csv`, rows: ledgerCsv({ sessions, payments }) });
  }

  /** Who owes, how much, days since the package started, aging bucket. */
  @Get('receivables.csv')
  async receivablesFile(@Res({ passthrough: true }) reply: HeaderReply) {
    const view = await this.receivables.list();
    return send(reply, { filename: `receivables-${riyadhDate(new Date().toISOString())}.csv`, rows: receivablesCsv(view.rows) });
  }
}
