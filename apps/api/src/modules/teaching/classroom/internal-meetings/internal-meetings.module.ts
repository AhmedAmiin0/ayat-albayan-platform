import { Module } from '@nestjs/common';
import { ClassroomSharedModule } from '@/modules/teaching/classroom/classroom-shared.module';
import { MeetingsModule } from '@/modules/teaching/classroom/meetings';
import {
  InternalMeetingRoutes,
  InternalMeetingsController,
  InternalMeetingsPublicController,
} from './internal-meetings.controller';
import { InternalMeetingJoinService } from './internal-meetings.join.service';
import { InternalMeetingKickService } from './internal-meetings.kick.service';

/** Internal meetings (migrations 193, 410-414): staff routes and the public guest join. */
@Module({
  imports: [ClassroomSharedModule, MeetingsModule],
  controllers: [InternalMeetingsController, InternalMeetingsPublicController],
  providers: [InternalMeetingRoutes, InternalMeetingJoinService, InternalMeetingKickService],
})
export class InternalMeetingsModule {}
