import { exportRoutes as routes, expenseExportQuerySchema } from '@ab/shared';
import { addCalendarDays, addCalendarMonths } from '@ab/time';
import { Controller, Res } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { z } from 'zod';
import { rangeWindow, riyadhDate } from '@/modules/reporting/dashboard/range';
import { ReceivablesService } from '@/modules/finance/receivables/receivables.service';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { attachment, toCsv } from './csv';
import { FinanceExportsQueries } from './finance-exports.queries';
import { expenseCsv, ledgerCsv, receivablesCsv } from './finance.rows';

type Input<K extends keyof typeof routes> = RouteInputOf<(typeof routes)[K]>;

interface HeaderReply {
  header(name: string, value: string): unknown;
}

function send(
  reply: HeaderReply,
  input: { filename: string; rows: Parameters<typeof toCsv>[0] },
): string {
  reply.header('Content-Type', 'text/csv; charset=utf-8');
  reply.header('Content-Disposition', attachment(input.filename));
  reply.header('Access-Control-Expose-Headers', 'Content-Disposition');
  return toCsv(input.rows);
}

const [byMonth, byYear] = expenseExportQuerySchema.options;

/** The expense months a request covers (first and last «YYYY-MM-01») and its file name part. */
const expenseSpan = z.union([
  byMonth.transform(({ month }) => ({ first: `${month}-01`, last: `${month}-01`, span: month })),
  byYear.transform(({ year }) => ({ first: `${year}-01-01`, last: `${year}-12-01`, span: year })),
]);

/** «YYYY-MM» → the Riyadh month as a window (the dashboard's months). */
function monthWindow(month: string) {
  const last = addCalendarDays(addCalendarMonths(month, 1), -1);
  return rangeWindow({ from: `${month}-01`, to: last });
}

/** Finance CSVs: expenses, the teacher ledger, receivables. Admin only. */
@ApiBearerAuth()
@Controller()
export class FinanceExportsController {
  constructor(
    private readonly queries: FinanceExportsQueries,
    private readonly receivables: ReceivablesService,
  ) {}

  @Route(routes.expenses)
  async expenses(
    @RouteInput() { query }: Input<'expenses'>,
    @Res({ passthrough: true }) reply: HeaderReply,
  ) {
    const { first, last, span } = expenseSpan.parse(query);
    const rows = expenseCsv(await this.queries.expenses(first, last));
    return send(reply, { filename: `expenses-${span}.csv`, rows });
  }

  /** The month's ledger sessions, then the payments made in it. */
  @Route(routes['teacher-ledger'])
  async ledger(
    @RouteInput() { query }: Input<'teacher-ledger'>,
    @Res({ passthrough: true }) reply: HeaderReply,
  ) {
    const { month, teacherId } = query;
    const w = monthWindow(month);
    const [sessions, payments] = await Promise.all([
      this.queries.sessions(w, teacherId),
      this.queries.teacherPayments(w, teacherId),
    ]);
    return send(reply, {
      filename: `teacher-ledger-${month}.csv`,
      rows: ledgerCsv({ sessions, payments }),
    });
  }

  /** Who owes, how much, days since the package started, aging bucket. */
  @Route(routes.receivables)
  async receivablesFile(@Res({ passthrough: true }) reply: HeaderReply) {
    const view = await this.receivables.list();
    const filename = `receivables-${riyadhDate(new Date().toISOString())}.csv`;
    return send(reply, { filename, rows: receivablesCsv(view.rows) });
  }
}
