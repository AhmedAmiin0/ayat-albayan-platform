import { Module } from '@nestjs/common';
import { ReportPdfModule } from '@/modules/reporting/report-pdf';
import { ReportsSharedModule } from '@/modules/reporting/reports/shared';
import { ReportFollowUp } from './report-follow-up';
import { PendingPdfQueue, ReportPdfQueue } from './report-pdf.queue';
import { ReportSubmitService } from './report-submit.service';

/** Submit: versions and the lesson outcome, then the PDF kick (R-REP-03) and the follow-up push. */
@Module({
  imports: [ReportsSharedModule, ReportPdfModule],
  providers: [
    ReportFollowUp,
    ReportSubmitService,
    { provide: ReportPdfQueue, useClass: PendingPdfQueue },
  ],
  exports: [ReportSubmitService],
})
export class ReportSubmitModule {}
