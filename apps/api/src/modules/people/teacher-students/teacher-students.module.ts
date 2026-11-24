import { Module } from '@nestjs/common';
import { TeachersModule } from '@/modules/people/teachers/teachers.module';
import { TeacherStudentsController } from './teacher-students.controller';
import { TeacherStudentsRepo } from './teacher-students.repo';
import { TeacherStudentsService } from './teacher-students.service';

/** R-TCH-03. */
@Module({
  imports: [TeachersModule],
  controllers: [TeacherStudentsController],
  providers: [TeacherStudentsRepo, TeacherStudentsService],
})
export class TeacherStudentsModule {}
