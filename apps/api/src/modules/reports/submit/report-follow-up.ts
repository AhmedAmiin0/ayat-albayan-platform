import { Injectable, Logger } from '@nestjs/common';
import { LessonEvents } from '../../../common/events/lesson-events';
import { PushService } from '../../../common/push/push.service';
import { ReportPdfQueue } from './report-pdf.queue';

/**
 * After a submit commits: the balance alerts hear that the lesson changed (docs/11 §3, R-SUB-02)
 * and the PDF builder is told (R-REP-03), and the admins get report_submitted (R-MOB-01; one push
 * per report id, so an edit never pushes again). All are already safe in the database (the lesson row,
 * pdf_status = pending), so a failure here is logged, never thrown: the sweeps catch up.
 */
export type SubmittedReport = { id: string; lesson_id: string; student_id: string };

@Injectable()
export class ReportFollowUp {
  private readonly log = new Logger(ReportFollowUp.name);

  constructor(
    private readonly events: LessonEvents,
    private readonly pdf: ReportPdfQueue,
    private readonly push: PushService,
  ) {}

  async submitted(report: SubmittedReport, names: { student: string; teacher: string }): Promise<void> {
    await this.events.changed([report.lesson_id]);
    await this.renderPdf(report.id);
    await this.push.notifyAdmins('report_submitted', {
      subject: report.id,
      vars: names,
      data: { reportId: report.id, lessonId: report.lesson_id, studentId: report.student_id },
    });
  }

  async renderPdf(reportId: string): Promise<void> {
    try {
      await this.pdf.enqueue(reportId);
    } catch (e) {
      this.log.error(`report ${reportId}: pdf enqueue failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
