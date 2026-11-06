import { Module } from '@nestjs/common';
import { RateLimitRepo } from '@/common/http/rate-limit.repo';
import { ReportCodeService } from './access/report-code.service';
import { ReportPublicController } from './access/report-public.controller';
import { ReportPublicLimit } from './access/report-public.limit';
import { ReportPageController } from './report-page.controller';
import { ReportPageRepo } from './report-page.repo';
import { ReportPageService } from './report-page.service';
import { ReportReaders } from './report-readers';

/**
 * The report's live page (owner 2026-11-06): /report/<public_id> read from the saved report, its
 * files and the PDF; access/: the WhatsApp code and the report's cookie for anyone not signed
 * in. StorageService, CodeSend and the DB come from their global modules.
 */
@Module({
  controllers: [ReportPageController, ReportPublicController],
  providers: [
    ReportPageRepo,
    ReportPageService,
    ReportReaders,
    ReportCodeService,
    ReportPublicLimit,
    RateLimitRepo,
  ],
  exports: [ReportPageService],
})
export class ReportPageModule {}
