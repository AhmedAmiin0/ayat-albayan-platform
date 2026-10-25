import { Injectable } from '@nestjs/common';
import { ReportPdfJob } from '../../report-pdf/report-pdf.job';
import { ReportsQueries } from '../reports.queries';

/**
 * "report.submitted" → the PDF builder (R-REP-03). The submit transaction already wrote
 * pdf_status = 'pending', the durable queue the PDF job claims (docs/11 §5); `enqueue` is called
 * after the commit (and after an admin retry) so the job starts now instead of at its next
 * poll. Must be idempotent and must never disturb a render in flight.
 */
export abstract class ReportPdfQueue {
  abstract enqueue(reportId: string): Promise<void>;
}

/** Makes sure a submitted report without a PDF state is `pending`, then kicks ReportPdfJob. */
@Injectable()
export class PendingPdfQueue extends ReportPdfQueue {
  constructor(
    private readonly queries: ReportsQueries,
    private readonly job: ReportPdfJob,
  ) {
    super();
  }

  async enqueue(reportId: string): Promise<void> {
    await this.queries.requestPdf(reportId);
    // Single-flight and never throws; a kick during a run queues one more pass.
    void this.job.kick();
  }
}
