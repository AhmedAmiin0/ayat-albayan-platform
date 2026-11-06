import { Module } from '@nestjs/common';
import { ReportPageController } from './report-page.controller';
import { ReportPageRepo } from './report-page.repo';
import { ReportPageService } from './report-page.service';
import { ReportReaders } from './report-readers';

/**
 * The report's live page (owner 2026-11-06): /report/<public_id> read from the saved report, its
 * files and the PDF. StorageService and the DB come from their global modules.
 */
@Module({
  controllers: [ReportPageController],
  providers: [ReportPageRepo, ReportPageService, ReportReaders],
  exports: [ReportPageService],
})
export class ReportPageModule {}
