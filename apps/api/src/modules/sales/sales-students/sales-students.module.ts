import { Module } from '@nestjs/common';
import { LessonsModule } from '@/modules/teaching/lessons';
import { ReportsModule } from '@/modules/reporting/reports';
import { TrialDateRepo } from '@/modules/teaching/booking';
import { SalesModule } from '@/modules/sales/sales';
import { SalesStudentAttendanceController, StudentAttendanceController } from './attendance/student-attendance.controller';
import { StudentAttendanceRepo } from './attendance/student-attendance.repo';
import { StudentAttendanceService } from './attendance/student-attendance.service';
import { TeacherAttendanceController } from './attendance/teacher-attendance.controller';
import { TeacherAttendanceService } from './attendance/teacher-attendance.service';
import { SalesStudentController } from './details/sales-student.controller';
import { SalesStudentRepo } from './details/sales-student.repo';
import { SalesStudentReads } from './details/sales-student.reads';
import { SalesStudentService } from './details/sales-student.service';
import { SalesLessonActionsController } from './lessons/sales-lesson-actions.controller';
import { LessonServices, SalesLessonActions } from './lessons/sales-lesson-actions.service';
import { SalesStudentScope } from './sales-student-scope';
import { SalesTeacherOverviewController, SalesTeacherOverviewService } from './teachers/sales-teacher-overview.controller';
import { SalesTeacherOverviewRepo } from './teachers/sales-teacher-overview.repo';

/**
 * Sales as the academy's assistant (docs/16 rows 36–37): «تفاصيل الطالب» of any student (subscriptions and
 * reports of hers only) and its «سجل الحضور» (also on the admin's file, and the teacher's own, docs/46 C5), a teacher's «الجدول» / «الحضور», moving or
 * cancelling a lesson of her students and confirming any lesson. Thin: the scope is SalesQueries.ownership, the reads
 * and the writes are the admin's and the teacher's (SalesHistoryQueries, ReportHistoryQueries, ReportFilesService,
 * TrialDateQueries, RescheduleOneService, LessonCancelService, LessonStatusService).
 */
@Module({
  imports: [SalesModule, LessonsModule, ReportsModule],
  controllers: [SalesStudentController, SalesLessonActionsController, SalesTeacherOverviewController, SalesStudentAttendanceController,
    StudentAttendanceController, TeacherAttendanceController],
  providers: [SalesStudentScope, SalesStudentRepo, TrialDateRepo, SalesStudentReads, SalesStudentService, LessonServices, SalesLessonActions,
    SalesTeacherOverviewRepo, SalesTeacherOverviewService, StudentAttendanceRepo, StudentAttendanceService,
    TeacherAttendanceService],
})
export class SalesStudentsModule {}
