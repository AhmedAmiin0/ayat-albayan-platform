import { Module } from '@nestjs/common';
import { LessonsModule } from '../../teaching/lessons';
import { ReportsModule } from '../../reporting/reports';
import { SalesModule } from '../sales';
import { SalesStudentController } from './details/sales-student.controller';
import { SalesStudentQueries } from './details/sales-student.queries';
import { SalesStudentReads } from './details/sales-student.reads';
import { SalesStudentService } from './details/sales-student.service';
import { SalesLessonActionsController } from './lessons/sales-lesson-actions.controller';
import { LessonServices, SalesLessonActions } from './lessons/sales-lesson-actions.service';
import { SalesStudentScope } from './sales-student-scope';

/**
 * The salesperson's own students (owner 2026-10-27, docs/16 rows 36–37): «تفاصيل الطالب» (subscriptions,
 * attendance, reports) and moving or cancelling one of their lessons. Thin: the scope is SalesQueries.ownership,
 * the reads and the writes are the admin's and the teacher's (SalesHistoryQueries, ReportHistoryQueries,
 * ReportFilesService, RescheduleOneService, LessonCancelService).
 */
@Module({
  imports: [SalesModule, LessonsModule, ReportsModule],
  controllers: [SalesStudentController, SalesLessonActionsController],
  providers: [SalesStudentScope, SalesStudentQueries, SalesStudentReads, SalesStudentService, LessonServices, SalesLessonActions],
})
export class SalesStudentsModule {}
