import { Module } from '@nestjs/common';
import { ReportPdfModule } from '../report-pdf/report-pdf.module';
import { TeachersModule } from '../../people/teachers/teachers.module';
import { ReportAccess } from './report-access';
import { ReportAttachmentsController } from './files/report-attachments.controller';
import { ReportAttachmentsQueries } from './files/report-attachments.queries';
import { ReportEntryController } from './submit/report-entry.controller';
import { ReportFilesService } from './files/report-files.service';
import { ReportFollowUp } from './submit/report-follow-up';
import { ReportGate } from './submit/report-gate';
import { ReportHistoryQueries } from './history/report-history.queries';
import { ReportHistoryService } from './history/report-history.service';
import { ReportLessonQueries } from './report-lesson.queries';
import { PendingPdfQueue, ReportPdfQueue } from './submit/report-pdf.queue';
import { ReportSubmitService } from './submit/report-submit.service';
import { ReportsController } from './reports.controller';
import { ReportsQueries } from './reports.queries';
import { ReportsService } from './reports.service';
import { ReportsSettings } from './reports.settings';
import { TeacherReportsQueries } from './teacher/teacher-reports.queries';
import { TeacherReportsService } from './teacher/teacher-reports.service';
import { ReportV2Controller } from './v2/report-v2.controller';
import { ReportV2Service } from './v2/report-v2.service';

/**
 * Lesson reports: form prefill, drafts, submit (versions + lesson outcome), attachments, history
 * + grade series, teacher pending and submitted reports. R-REP-01/02/04/05, R-TCH-03 (docs/11 §4).
 * ReportPdfQueue marks a report pending and kicks ReportPdfJob (R-REP-03). v2/: the new form (report_form_v2).
 */
@Module({
  imports: [TeachersModule, ReportPdfModule],
  controllers: [ReportsController, ReportAttachmentsController, ReportEntryController, ReportV2Controller],
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
    ReportV2Service,
    ReportsQueries,
    ReportsService,
    ReportsSettings,
    TeacherReportsQueries,
    TeacherReportsService,
    { provide: ReportPdfQueue, useClass: PendingPdfQueue },
  ],
  exports: [ReportFilesService, ReportHistoryQueries, ReportPdfQueue, ReportsQueries],
})
export class ReportsModule {}
