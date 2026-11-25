import { Module } from '@nestjs/common';
import { SalesStudentsSharedModule } from '@/modules/sales/sales-students/shared';
import { LessonsModule } from '@/modules/teaching/lessons';
import { SalesLessonActionsController } from './sales-lesson-actions.controller';
import { LessonServices, SalesLessonActions } from './sales-lesson-actions.service';

@Module({
  imports: [SalesStudentsSharedModule, LessonsModule],
  controllers: [SalesLessonActionsController],
  providers: [LessonServices, SalesLessonActions],
})
export class SalesLessonActionsModule {}
