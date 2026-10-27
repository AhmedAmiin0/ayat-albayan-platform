import type { ReportSummaryView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { historyResponse, ReportFilesService, ReportHistoryQueries } from '../../../reporting/reports';
import { SalesHistoryQueries } from '../../sales';

/** The latest sent reports in «التقارير» (the teacher's history pages by 10; a salesperson reads the recent ones). */
const REPORTS_LIMIT = 50;

/**
 * The other modules' reads «تفاصيل الطالب» reuses: the subscriptions of «السجل» (SalesHistoryQueries),
 * the teacher's report history (ReportHistoryQueries + historyResponse) and the report PDF signer.
 */
@Injectable()
export class SalesStudentReads {
  constructor(
    readonly histories: SalesHistoryQueries,
    private readonly reports: ReportHistoryQueries,
    readonly files: ReportFilesService,
  ) {}

  /** The student's sent reports, newest first, as GET /students/:id/reports pages them. */
  async sentReports(studentId: string): Promise<{ items: ReportSummaryView[]; total: number }> {
    const rows = await this.reports.submitted(studentId);
    const [lessons, seq] = await Promise.all([
      this.reports.lessons(rows.map((r) => r.lesson_id)),
      this.reports.sequence(studentId),
    ]);
    const page = historyResponse({ rows, lessons, seq, page: { page: 1, pageSize: REPORTS_LIMIT } });
    return { items: page.items, total: page.total };
  }
}
