import { Module } from '@nestjs/common';
import { TeachersModule } from '../teachers/teachers.module';
import { TeacherStudentsController } from './teacher-students.controller';
import { TeacherStudentsQueries } from './teacher-students.queries';
import { TeacherStudentsService } from './teacher-students.service';

/** Teacher tab «الطلاب»: GET /teachers/me/students?kind=subscribed|trial (R-TCH-03). */
@Module({
  imports: [TeachersModule],
  controllers: [TeacherStudentsController],
  providers: [TeacherStudentsQueries, TeacherStudentsService],
})
export class TeacherStudentsModule {}
