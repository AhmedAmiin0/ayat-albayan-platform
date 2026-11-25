import { Module } from '@nestjs/common';
import { RecordingsModule } from '@/modules/teaching/classroom/recordings';
import { ClassroomSharedModule } from './classroom-shared.module';
import { KickService } from './moderation/kick.service';
import { ModerationController } from './moderation/moderation.controller';
import { MuteLimit } from './moderation/mute-limit';
import { LessonMuteController, MeetingMuteController } from './moderation/mute.controller';
import { MeetingMuteService, MuteService } from './moderation/mute.service';
import { RoomPersonRepo } from './moderation/room-person.repo';
import { LessonShareController, MeetingShareController } from './moderation/share-grant.controller';
import { MeetingShareGrantService, ShareGrantService } from './moderation/share-grant.service';

/** Kick, mute and screen-share grants; the moderation routes also list a lesson's recordings. */
@Module({
  imports: [ClassroomSharedModule, RecordingsModule],
  controllers: [
    ...[ModerationController, LessonMuteController, MeetingMuteController],
    ...[LessonShareController, MeetingShareController],
  ],
  providers: [
    { provide: MuteLimit, useFactory: () => new MuteLimit() },
    ...[KickService, RoomPersonRepo, MuteService, MeetingMuteService],
    ...[ShareGrantService, MeetingShareGrantService],
  ],
})
export class ModerationModule {}
