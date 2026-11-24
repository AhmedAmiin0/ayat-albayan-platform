import { Module } from '@nestjs/common';
import { ReportsSharedModule } from '@/modules/reporting/reports/shared';
import { ReportAttachmentsController } from './report-attachments.controller';
import { ReportAttachmentsQueries } from './report-attachments.queries';
import { ReportFilesService } from './report-files.service';

/** A report's attachments and its PDF link (R-REP-05); sales-students signs the PDF through it. */
@Module({
  imports: [ReportsSharedModule],
  controllers: [ReportAttachmentsController],
  providers: [ReportAttachmentsQueries, ReportFilesService],
  exports: [ReportFilesService],
})
export class ReportFilesModule {}
