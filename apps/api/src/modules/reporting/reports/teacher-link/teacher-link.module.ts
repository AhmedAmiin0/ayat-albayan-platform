import { Module } from '@nestjs/common';
import { RateLimitRepo } from '@/common/http/rate-limit.repo';
import { ReportFilesModule } from '@/modules/reporting/reports/files';
import { ReportsSharedModule } from '@/modules/reporting/reports/shared';
import { ReportSubmitModule } from '@/modules/reporting/reports/submit';
import { ReportV2Module } from '@/modules/reporting/reports/v2';
import { TeacherLinkFilesController } from './teacher-link-files.controller';
import { TeacherLinkAccess } from './teacher-link.access';
import { TeacherLinkController } from './teacher-link.controller';
import { TeacherLinkFiles } from './teacher-link.files';
import { TeacherLinkLimit } from './teacher-link.limit';
import { TeacherLinkReports } from './teacher-link.reports';
import { TeacherLinkRepo } from './teacher-link.repo';

/** The teacher's no-login report link for one lesson (docs/19): its reports and attachments. */
@Module({
  imports: [ReportsSharedModule, ReportSubmitModule, ReportV2Module, ReportFilesModule],
  controllers: [TeacherLinkController, TeacherLinkFilesController],
  providers: [
    ...[RateLimitRepo, TeacherLinkRepo, TeacherLinkAccess, TeacherLinkLimit],
    ...[TeacherLinkReports, TeacherLinkFiles],
  ],
})
export class TeacherLinkModule {}
