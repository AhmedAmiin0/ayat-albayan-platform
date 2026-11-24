import { Module } from '@nestjs/common';
import { ReportsSharedModule } from '@/modules/reporting/reports/shared';
import { ReportHistoryQueries } from './report-history.queries';
import { ReportHistoryService } from './report-history.service';

/** A student's report history, grade series and the pending list (R-REP-04). */
@Module({
  imports: [ReportsSharedModule],
  providers: [ReportHistoryQueries, ReportHistoryService],
  exports: [ReportHistoryQueries, ReportHistoryService],
})
export class ReportHistoryModule {}
