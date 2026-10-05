import { monthStart, type DateRangeQuery } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { rangeWindow, riyadhDate } from '../dashboard/range';
import { toCsv } from './csv';
import { lessonRows, studentRows } from './exports.rows';
import { ExportsQueries, type PaymentCsvFilter } from './exports.queries';
import { paymentRows, payoutRows } from './money.rows';

export interface CsvFile {
  /** ASCII: `<name>-<range>.csv`. */
  filename: string;
  csv: string;
}

const span = (r: DateRangeQuery) => `${r.from}_${r.to}`;

/** C1–C4 (docs/11 §9; R-RPT-03, R-TCH-04): the four CSV exports. */
@Injectable()
export class ExportsService {
  constructor(private readonly queries: ExportsQueries) {}

  async students(now = new Date()): Promise<CsvFile> {
    const rows = await this.queries.students();
    return { filename: `students-${riyadhDate(now.toISOString())}.csv`, csv: toCsv(studentRows(rows)) };
  }

  async lessons(range: DateRangeQuery): Promise<CsvFile> {
    const rows = await this.queries.lessons(rangeWindow(range));
    return { filename: `lessons-${span(range)}.csv`, csv: toCsv(lessonRows(rows)) };
  }

  async payments(range: DateRangeQuery, filter: PaymentCsvFilter = {}): Promise<CsvFile> {
    const rows = await this.queries.payments(rangeWindow(range), filter);
    return { filename: `payments-${span(range)}.csv`, csv: toCsv(paymentRows(rows)) };
  }

  /** `month` = "YYYY-MM". */
  async payouts(month: string): Promise<CsvFile> {
    const rows = await this.queries.payouts(monthStart(month));
    return { filename: `payouts-${month}.csv`, csv: toCsv(payoutRows(rows)) };
  }
}
