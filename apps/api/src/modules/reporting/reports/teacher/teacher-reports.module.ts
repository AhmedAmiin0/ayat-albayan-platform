import { Module } from '@nestjs/common';
import { ReportHistoryModule } from '@/modules/reporting/reports/history';
import { ReportsSharedModule } from '@/modules/reporting/reports/shared';
import { TeacherReportsQueries } from './teacher-reports.queries';
import { TeacherReportsService } from './teacher-reports.service';

/** The teacher's own pending and submitted reports (R-TCH-03). */
@Module({
  imports: [ReportsSharedModule, ReportHistoryModule],
  providers: [TeacherReportsQueries, TeacherReportsService],
  exports: [TeacherReportsService],
})
export class TeacherReportsModule {}
