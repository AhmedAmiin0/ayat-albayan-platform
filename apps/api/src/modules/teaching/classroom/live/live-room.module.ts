import { Module } from '@nestjs/common';
import { ClassroomSharedModule } from '@/modules/teaching/classroom/classroom-shared.module';
import { MaxDurationModule } from '@/modules/teaching/classroom/max-duration';
import { LessonEndController } from './lesson-end.controller';
import { LessonEndRepo } from './lesson-end.repo';
import { LessonEndService } from './lesson-end.service';
import { LessonLivePush } from './lesson-live.push';
import { LessonLiveRepo } from './lesson-live.repo';
import { RoomPresenceRepo } from './room-presence.repo';
import { RoomPresenceService } from './room-presence.service';

/** The live lesson room: end for everyone, presence (fed by the LiveKit webhook), started push. */
@Module({
  imports: [ClassroomSharedModule, MaxDurationModule],
  controllers: [LessonEndController],
  providers: [
    ...[LessonEndRepo, LessonEndService, LessonLiveRepo, LessonLivePush],
    ...[RoomPresenceRepo, RoomPresenceService],
  ],
  exports: [RoomPresenceService],
})
export class LiveRoomModule {}
