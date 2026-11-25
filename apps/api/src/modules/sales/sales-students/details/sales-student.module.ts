import { Module } from '@nestjs/common';
import { ReportFilesModule, ReportHistoryModule } from '@/modules/reporting/reports';
import { SalesModule } from '@/modules/sales/sales';
import { SalesStudentsSharedModule } from '@/modules/sales/sales-students/shared';
import { SalesStudentController } from './sales-student.controller';
import { SalesStudentReads } from './sales-student.reads';
import { SalesStudentService } from './sales-student.service';

@Module({
  imports: [SalesStudentsSharedModule, SalesModule, ReportFilesModule, ReportHistoryModule],
  controllers: [SalesStudentController],
  providers: [SalesStudentReads, SalesStudentService],
})
export class SalesStudentModule {}
