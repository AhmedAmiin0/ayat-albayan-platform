import { Module } from '@nestjs/common';
import { SchedulingModule } from '@/modules/teaching/scheduling';
import { LessonStoreModule } from '@/modules/teaching/lessons/store';
import { LessonTimeController } from './lesson-time.controller';
import { TimeEditPayout } from './time-edit.payout';
import { TimeEditRepo } from './time-edit.repo';
import { LessonTimeService } from './time-edit.service';

@Module({
  imports: [LessonStoreModule, SchedulingModule],
  controllers: [LessonTimeController],
  providers: [LessonTimeService, TimeEditPayout, TimeEditRepo],
})
export class LessonTimeModule {}
