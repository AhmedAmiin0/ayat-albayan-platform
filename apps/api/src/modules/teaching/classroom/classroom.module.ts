import { Module } from '@nestjs/common';
import { InboxModule } from '@/modules/messaging/inbox';
import { TeachersModule } from '@/modules/people/teachers';
import { AssistantsModule } from '@/modules/teaching/classroom/assistants';
import { InternalMeetingsModule } from '@/modules/teaching/classroom/internal-meetings';
import { LiveRoomModule } from '@/modules/teaching/classroom/live';
import { LivekitWebhookModule } from '@/modules/teaching/classroom/livekit';
import { MaxDurationModule } from '@/modules/teaching/classroom/max-duration';
import { MeetingsModule } from '@/modules/teaching/classroom/meetings';
import { RecordingsModule } from '@/modules/teaching/classroom/recordings';
import { StudentLinkModule } from '@/modules/teaching/classroom/student-link';
import { ClassroomSharedModule } from './classroom-shared.module';
import { ClassroomController, JoinLinkStaffController } from './classroom.controller';
import { ClassroomPublicController } from './classroom.public.controller';
import { JoinLinkResolver } from './family-link/join-link.resolver';
import { GuestJoinService } from './join/guest-join.service';
import { JoinLinkCopyService } from './join/join-link.copy.service';
import { JoinLinkService } from './join/join-link.service';
import { JoinLinkStaffService } from './join/join-link.staff.service';
import { RoomJoinService } from './join/room-join.service';
import { ModerationModule } from './moderation.module';
import { RoomOpenModule } from './room-open.module';

/**
 * Online classrooms on self-hosted LiveKit (docs/09): staff, family links, internal meetings. The
 * student file's recordings (modules/student-recordings) sign links and read rows the same way and
 * the family portal (modules/people/portal) admits its own student like the student's link does,
 * so the shared, recordings and student-link modules are re-exported.
 */
@Module({
  imports: [
    ...[InboxModule, TeachersModule, ClassroomSharedModule, RoomOpenModule, ModerationModule],
    ...[RecordingsModule, MeetingsModule, InternalMeetingsModule, StudentLinkModule],
    ...[AssistantsModule, LivekitWebhookModule, LiveRoomModule, MaxDurationModule],
  ],
  controllers: [ClassroomController, JoinLinkStaffController, ClassroomPublicController],
  providers: [
    ...[RoomJoinService, JoinLinkService, JoinLinkCopyService, JoinLinkStaffService],
    ...[GuestJoinService, JoinLinkResolver],
  ],
  exports: [ClassroomSharedModule, RecordingsModule, StudentLinkModule],
})
export class ClassroomModule {}
