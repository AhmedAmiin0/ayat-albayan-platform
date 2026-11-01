import { Module } from '@nestjs/common';
import { TeachersModule } from '@/modules/people/teachers/teachers.module';
import { TeacherStudentsController } from './teacher-students.controller';
import { TeacherStudentsRepo } from './teacher-students.repo';
import { TeacherStudentsService } from './teacher-students.service';

/** Teacher tab «الطلاب»: GET /teachers/me/students?kind=subscribed|trial (R-TCH-03). */
@Module({
  imports: [TeachersModule],
  controllers: [TeacherStudentsController],
  providers: [TeacherStudentsRepo, TeacherStudentsService],
})
export class TeacherStudentsModule {}
