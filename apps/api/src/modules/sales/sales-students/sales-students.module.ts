import { Module } from '@nestjs/common';
import { LessonsModule } from '../../teaching/lessons';
import { ReportsModule } from '../../reporting/reports';
import { TrialDateQueries } from '../../teaching/booking';
import { SalesModule } from '../sales';
import { SalesStudentAttendanceController, StudentAttendanceController } from './attendance/student-attendance.controller';
import { StudentAttendanceQueries } from './attendance/student-attendance.queries';
import { StudentAttendanceService } from './attendance/student-attendance.service';
import { SalesStudentController } from './details/sales-student.controller';
import { SalesStudentQueries } from './details/sales-student.queries';
import { SalesStudentReads } from './details/sales-student.reads';
import { SalesStudentService } from './details/sales-student.service';
import { SalesLessonActionsController } from './lessons/sales-lesson-actions.controller';
import { LessonServices, SalesLessonActions } from './lessons/sales-lesson-actions.service';
import { SalesStudentScope } from './sales-student-scope';
import { SalesTeacherOverviewController, SalesTeacherOverviewService } from './teachers/sales-teacher-overview.controller';
import { SalesTeacherOverviewQueries } from './teachers/sales-teacher-overview.queries';

/**
 * Sales as the academy's assistant (docs/16 rows 36–37): «تفاصيل الطالب» of any student (subscriptions and
 * reports of hers only) and its «سجل الحضور» (also on the admin's file), a teacher's «الجدول» / «الحضور», and moving or cancelling a lesson of her students.
 * Thin: the scope is SalesQueries.ownership, the reads and the writes are the admin's and the teacher's
 * (SalesHistoryQueries, ReportHistoryQueries, ReportFilesService, TrialDateQueries, RescheduleOneService, LessonCancelService).
 */
@Module({
  imports: [SalesModule, LessonsModule, ReportsModule],
  controllers: [SalesStudentController, SalesLessonActionsController, SalesTeacherOverviewController, SalesStudentAttendanceController,
    StudentAttendanceController],
  providers: [SalesStudentScope, SalesStudentQueries, TrialDateQueries, SalesStudentReads, SalesStudentService, LessonServices, SalesLessonActions,
    SalesTeacherOverviewQueries, SalesTeacherOverviewService, StudentAttendanceQueries, StudentAttendanceService],
})
export class SalesStudentsModule {}
