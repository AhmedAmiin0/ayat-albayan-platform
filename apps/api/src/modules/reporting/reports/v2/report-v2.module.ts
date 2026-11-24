import { Module } from '@nestjs/common';
import { ReportsSharedModule } from '@/modules/reporting/reports/shared';
import { ReportSubmitModule } from '@/modules/reporting/reports/submit';
import { ReportV2Controller } from './report-v2.controller';
import { ReportV2Service } from './report-v2.service';

/** The v2 report form (report_form_v2): its draft and submit. */
@Module({
  imports: [ReportsSharedModule, ReportSubmitModule],
  controllers: [ReportV2Controller],
  providers: [ReportV2Service],
  exports: [ReportV2Service],
})
export class ReportV2Module {}
