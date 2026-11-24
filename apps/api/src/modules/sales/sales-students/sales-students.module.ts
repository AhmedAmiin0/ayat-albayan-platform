import { Module } from '@nestjs/common';
import { StudentAttendanceModule } from '@/modules/sales/sales-students/attendance';
import { SalesStudentModule } from '@/modules/sales/sales-students/details';
import { SalesLessonActionsModule } from '@/modules/sales/sales-students/lessons';
import { SalesTeacherOverviewModule } from '@/modules/sales/sales-students/teachers';

/** docs/16 rows 36-37, docs/46 C5: thin; reads and writes are the admin's and teacher's. */
@Module({
  imports: [
    ...[SalesStudentModule, SalesLessonActionsModule],
    ...[SalesTeacherOverviewModule, StudentAttendanceModule],
  ],
})
export class SalesStudentsModule {}
