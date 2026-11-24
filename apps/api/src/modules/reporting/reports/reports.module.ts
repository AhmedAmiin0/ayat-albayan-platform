import { Module } from '@nestjs/common';
import { ReportPageModule } from '@/modules/reporting/report-page';
import { ReportFilesModule } from '@/modules/reporting/reports/files';
import { ReportHistoryModule } from '@/modules/reporting/reports/history';
import { ReportsSharedModule } from '@/modules/reporting/reports/shared';
import { ReportSubmitModule } from '@/modules/reporting/reports/submit';
import { TeacherReportsModule } from '@/modules/reporting/reports/teacher';
import { TeacherLinkModule } from '@/modules/reporting/reports/teacher-link';
import { ReportV2Module } from '@/modules/reporting/reports/v2';
import { ReportEntryController } from './report-entry.controller';
import { ReportsController } from './reports.controller';

/**
 * Lesson reports: form prefill, drafts, submit (versions + lesson outcome), attachments, history
 * + grade series, teacher pending and submitted reports. R-REP-01/02/04/05, R-TCH-03 (docs/11 §4).
 * ReportPdfQueue marks a report pending and kicks ReportPdfJob (R-REP-03). v2/: the new form
 * (report_form_v2).
 * teacher-link/: the teacher's no-login report link for one lesson (docs/19), and its issuer for
 * the reminders. ReportPageModule: the report's live page (/report/<public_id>).
 * The one place the report modules are wired: AppModule imports this.
 */
@Module({
  imports: [
    ...[ReportsSharedModule, ReportSubmitModule, ReportFilesModule, ReportHistoryModule],
    ...[TeacherReportsModule, ReportV2Module, TeacherLinkModule, ReportPageModule],
  ],
  controllers: [ReportsController, ReportEntryController],
})
export class ReportsModule {}
