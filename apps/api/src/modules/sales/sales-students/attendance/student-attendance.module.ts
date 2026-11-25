import { Module } from '@nestjs/common';
import { ReportsSharedModule } from '@/modules/reporting/reports';
import { SalesModule } from '@/modules/sales/sales';
import { SalesStudentsSharedModule } from '@/modules/sales/sales-students/shared';
import { LessonsModule } from '@/modules/teaching/lessons';
import {
  SalesStudentAttendanceController,
  StudentAttendanceController,
} from './student-attendance.controller';
import { StudentAttendanceRepo } from './student-attendance.repo';
import { StudentAttendanceService } from './student-attendance.service';
import { TeacherAttendanceController } from './teacher-attendance.controller';
import { TeacherAttendanceService } from './teacher-attendance.service';
import { TeacherStudentAccess } from './teacher-file/teacher-student-access';
import { TeacherStudentHeadService } from './teacher-file/teacher-student-head.service';

@Module({
  imports: [SalesStudentsSharedModule, SalesModule, LessonsModule, ReportsSharedModule],
  controllers: [
    ...[SalesStudentAttendanceController, StudentAttendanceController],
    TeacherAttendanceController,
  ],
  providers: [
    ...[StudentAttendanceRepo, StudentAttendanceService, TeacherAttendanceService],
    ...[TeacherStudentAccess, TeacherStudentHeadService],
  ],
})
export class StudentAttendanceModule {}
