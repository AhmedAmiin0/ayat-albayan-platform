import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '@/modules/finance/subscriptions';
import { TeachersModule } from '@/modules/people/teachers';
import { ScheduleNoticesModule } from '@/modules/teaching/schedule-notices';
import { SchedulingModule } from '@/modules/teaching/scheduling';
import { AutoHeldRepo } from '@/modules/teaching/lessons/auto-held/auto-held.repo';
import { LessonsRepo } from '@/modules/teaching/lessons/lessons.repo';
import { LessonsSettings } from '@/modules/teaching/lessons/lessons.settings';
import { LessonRoomStates } from '@/modules/teaching/lessons/live-room/lesson-room-states';
import { RoomInsideRepo } from '@/modules/teaching/lessons/live-room/room-inside.repo';
import { LessonAccess } from './lesson-access';
import { LessonStore } from './lesson-store';
import { LessonViewExtras } from './lesson-view-extras';
import { LessonViews } from './lesson-views';

/** What every lessons feature folder injects: the lesson store, its views, access and settings. */
@Module({
  imports: [SchedulingModule, SubscriptionsModule, TeachersModule, ScheduleNoticesModule],
  providers: [
    ...[LessonsRepo, LessonsSettings, LessonStore, LessonViews, LessonViewExtras],
    ...[LessonAccess, AutoHeldRepo, LessonRoomStates, RoomInsideRepo],
  ],
  exports: [
    ...[LessonsSettings, LessonStore, LessonViews],
    ...[LessonAccess, AutoHeldRepo, LessonRoomStates],
  ],
})
export class LessonStoreModule {}
