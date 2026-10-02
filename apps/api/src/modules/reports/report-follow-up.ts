import { Injectable, Logger } from '@nestjs/common';
import { LessonEvents } from '../../common/events/lesson-events';
import { ReportPdfQueue } from './report-pdf.queue';

/**
 * After a submit commits: the balance alerts hear that the lesson changed (docs/11 §3, R-SUB-02)
 * and the PDF builder is told (R-REP-03). Both are already safe in the database (the lesson row,
 * pdf_status = pending), so a failure here is logged, never thrown: the sweeps catch up.
 */
@Injectable()
export class ReportFollowUp {
  private readonly log = new Logger(ReportFollowUp.name);

  constructor(
    private readonly events: LessonEvents,
    private readonly pdf: ReportPdfQueue,
  ) {}

  async submitted(report: { id: string; lesson_id: string }): Promise<void> {
    await this.events.changed([report.lesson_id]);
    await this.renderPdf(report.id);
  }

  async renderPdf(reportId: string): Promise<void> {
    try {
      await this.pdf.enqueue(reportId);
    } catch (e) {
      this.log.error(`report ${reportId}: pdf enqueue failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
