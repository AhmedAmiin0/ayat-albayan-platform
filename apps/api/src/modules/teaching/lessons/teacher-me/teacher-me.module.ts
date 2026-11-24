import { Module } from '@nestjs/common';
import { LessonStatusModule } from '@/modules/teaching/lessons/status';
import { LessonStoreModule } from '@/modules/teaching/lessons/store';
import { TeacherCancelPush } from './teacher-cancel.push';
import { TeacherCancelRepo } from './teacher-cancel.repo';
import { TeacherConfirmRepo } from './teacher-confirm.repo';
import { TeacherLessonController } from './teacher-lesson.controller';
import { TeacherLessonDeps, TeacherLessonService } from './teacher-lesson.service';
import { TeacherMeController } from './teacher-me.controller';
import { TeacherMeRepo } from './teacher-me.repo';

@Module({
  imports: [LessonStoreModule, LessonStatusModule],
  controllers: [TeacherMeController, TeacherLessonController],
  providers: [
    ...[TeacherCancelPush, TeacherCancelRepo, TeacherConfirmRepo],
    ...[TeacherLessonDeps, TeacherLessonService, TeacherMeRepo],
  ],
  exports: [TeacherCancelRepo, TeacherMeRepo],
})
export class TeacherMeModule {}
