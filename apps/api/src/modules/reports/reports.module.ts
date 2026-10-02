import { Module } from '@nestjs/common';
import { ReportPdfModule } from '../report-pdf/report-pdf.module';
import { TeachersModule } from '../teachers/teachers.module';
import { ReportAccess } from './report-access';
import { ReportAttachmentsController } from './report-attachments.controller';
import { ReportAttachmentsQueries } from './report-attachments.queries';
import { ReportEntryController } from './report-entry.controller';
import { ReportFilesService } from './report-files.service';
import { ReportFollowUp } from './report-follow-up';
import { ReportGate } from './report-gate';
import { ReportHistoryQueries } from './report-history.queries';
import { ReportHistoryService } from './report-history.service';
import { ReportLessonQueries } from './report-lesson.queries';
import { PendingPdfQueue, ReportPdfQueue } from './report-pdf.queue';
import { ReportSubmitService } from './report-submit.service';
import { ReportsController } from './reports.controller';
import { ReportsQueries } from './reports.queries';
import { ReportsService } from './reports.service';

/**
 * Lesson reports: form prefill, drafts, submit (versions + lesson outcome), attachments, history
 * + grade series, teacher pending reports. R-REP-01/02/04/05, R-TCH-03 (docs/11 §4).
 * ReportPdfQueue marks a report pending and kicks ReportPdfJob (R-REP-03).
 */
@Module({
  imports: [TeachersModule, ReportPdfModule],
  controllers: [ReportsController, ReportAttachmentsController, ReportEntryController],
  providers: [
    ReportAccess,
    ReportAttachmentsQueries,
    ReportFilesService,
    ReportFollowUp,
    ReportGate,
    ReportHistoryQueries,
    ReportHistoryService,
    ReportLessonQueries,
    ReportSubmitService,
    ReportsQueries,
    ReportsService,
    { provide: ReportPdfQueue, useClass: PendingPdfQueue },
  ],
  exports: [ReportPdfQueue, ReportsQueries],
})
export class ReportsModule {}
