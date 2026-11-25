import { Module } from '@nestjs/common';
import { SchedulingModule } from '@/modules/teaching/scheduling';
import { LessonAutoHeldModule } from '@/modules/teaching/lessons/auto-held';
import { LessonStoreModule } from '@/modules/teaching/lessons/store';
import { LessonActionsController } from './lesson-actions.controller';
import { LessonCancelService } from './lesson-cancel.service';
import { LessonStatusService } from './lesson-status.service';

@Module({
  imports: [LessonStoreModule, LessonAutoHeldModule, SchedulingModule],
  controllers: [LessonActionsController],
  providers: [LessonCancelService, LessonStatusService],
  exports: [LessonCancelService, LessonStatusService],
})
export class LessonStatusModule {}
