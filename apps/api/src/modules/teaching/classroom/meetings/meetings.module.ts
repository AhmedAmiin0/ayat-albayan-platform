import { Module } from '@nestjs/common';
import { InboxModule } from '@/modules/messaging/inbox';
import { ClassroomSharedModule } from '@/modules/teaching/classroom/classroom-shared.module';
import { MeetingInviteFlow } from './invites/meeting-invite.flow';
import { MeetingInvitePolicies } from './invites/meeting-invite.policy';
import { MeetingInviteSender } from './invites/meeting-invite.sender';
import { MeetingInviteeRepo } from './invites/meeting-invitee.repo';
import { MeetingInviteeResolver } from './invites/meeting-invitee.resolver';
import { MeetingInviteesRepo } from './invites/meeting-invitees.repo';
import { MeetingInvitesController } from './invites/meeting-invites.controller';
import { MeetingInvitesDeps, MeetingInvitesService } from './invites/meeting-invites.service';
import { MeetingCreateDeps, MeetingCreateService } from './schedule/meeting-create.service';
import { MeetingListRepo } from './schedule/meeting-list.repo';
import { MeetingListService } from './schedule/meeting-list.service';
import { MeetingScheduleDeps, MeetingScheduleService } from './schedule/meeting-schedule.service';

/**
 * Internal meeting scheduling and invitations (R-MEET-01..03); the internal meetings routes
 * create and list meetings through it.
 */
@Module({
  imports: [ClassroomSharedModule, InboxModule],
  controllers: [MeetingInvitesController],
  providers: [
    ...[MeetingInviteeRepo, MeetingInviteeResolver, MeetingInviteesRepo, MeetingInviteSender],
    ...[MeetingInviteFlow, MeetingInvitePolicies, MeetingInvitesDeps, MeetingInvitesService],
    ...[MeetingScheduleDeps, MeetingScheduleService, MeetingCreateDeps, MeetingCreateService],
    ...[MeetingListRepo, MeetingListService],
  ],
  exports: [MeetingCreateService, MeetingListService],
})
export class MeetingsModule {}
