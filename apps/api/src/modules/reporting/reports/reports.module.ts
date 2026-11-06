import { Module } from '@nestjs/common';
import { loadEnv } from '@/config/env/env';
import { RateLimitRepo } from '@/common/http/rate-limit.repo';
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
import { TEACHER_LINK_CONFIG, type TeacherLinkConfig } from './teacher-link/teacher-link.config';
import { TeacherLinkAccess } from './teacher-link/teacher-link.access';
import { TeacherLinkController } from './teacher-link/teacher-link.controller';
import { TeacherReportLinks } from './teacher-link/teacher-link.issuer';
import { TeacherLinkLimit } from './teacher-link/teacher-link.limit';
import { TeacherLinkReports } from './teacher-link/teacher-link.reports';
import { TeacherLinkRepo } from './teacher-link/teacher-link.repo';

/** The teacher link's secret: the existing public-link secret (FEEDBACK_TOKEN_SECRET). */
const linkConfig = (): TeacherLinkConfig => ({ secret: loadEnv().FEEDBACK_TOKEN_SECRET ?? null });

/**
 * Lesson reports: form prefill, drafts, submit (versions + lesson outcome), attachments, history
 * + grade series, teacher pending and submitted reports. R-REP-01/02/04/05, R-TCH-03 (docs/11 §4).
 * ReportPdfQueue marks a report pending and kicks ReportPdfJob (R-REP-03). v2/: the new form
 * (report_form_v2).
 * teacher-link/: the teacher's no-login report link for one lesson (docs/19), and its issuer for
 * the reminders.
 */
@Module({
  imports: [TeachersModule, ReportPdfModule],
  controllers: [
    ReportsController,
    ReportAttachmentsController,
    ReportEntryController,
    ReportV2Controller,
    TeacherLinkController,
  ],
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
    { provide: TEACHER_LINK_CONFIG, useFactory: linkConfig },
    RateLimitRepo,
    TeacherLinkRepo,
    TeacherLinkAccess,
    TeacherLinkLimit,
    TeacherLinkReports,
    TeacherReportLinks,
  ],
  exports: [
    ReportFilesService,
    ReportHistoryQueries,
    ReportPdfQueue,
    ReportsQueries,
    TeacherReportLinks,
    TEACHER_LINK_CONFIG,
  ],
})
export class ReportsModule {}
