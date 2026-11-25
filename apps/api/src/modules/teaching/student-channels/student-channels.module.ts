import { Module } from '@nestjs/common';
import { PortalModule } from '@/modules/people/portal';
import { PresenceModule } from '@/modules/people/presence';
import { TeachersModule } from '@/modules/people/teachers';
import { AccessDeps, ChannelAccess } from './channel-access';
import { CHANNEL_CONTROLLERS } from './controllers/channel.controllers';
import { ChannelEditsRepo } from './channel-edits.repo';
import { ChannelEdits, ChannelEditsAfter } from './channel-edits.service';
import { ChannelNotify } from './channel-notify';
import { ChannelPeopleRepo } from './channel-people.repo';
import { ChannelRepo } from './channel.repo';
import { ChannelService, TeacherChannelList } from './channel.service';
import { FamilyChatSettings, TeacherChatSettings } from './family-chat.settings';
import { ChannelMedia } from './media/channel-media.service';
import { ChannelBell } from './notify/channel-bell';
import { ChannelBellRepo } from './notify/channel-bell.repo';
import { ChannelMembers } from './reads/channel-members';
import { ChannelReadState } from './reads/channel-read-state';
import { ChannelReadsRepo } from './reads/channel-reads.repo';
import { ChannelReadsService } from './reads/channel-reads.service';
import { ChannelSendInputs } from './send/channel-send-inputs';
import { ChannelSender } from './send/channel-sender';
import { ChannelSeatRepo } from './seat/channel-seat.repo';
import { ChannelSeatService } from './seat/channel-seat.service';
import { ChannelViews } from './views/channel-views.service';

/**
 * The student channel (docs/31 §2): an in-platform teacher ↔ family chat per student, opened by the
 * students INSERT trigger (migration 800); the one assistant in its seat writes too
 * (ChannelSeatService), student_channels.monitor only reads.
 * PushService and StorageService come from global modules. Edit / delete:
 * ChannelEdits.
 */
@Module({
  imports: [PortalModule, PresenceModule, TeachersModule],
  controllers: CHANNEL_CONTROLLERS,
  providers: [
    FamilyChatSettings,
    TeacherChatSettings,
    ChannelRepo,
    ChannelPeopleRepo,
    AccessDeps,
    ChannelAccess,
    ChannelNotify,
    ChannelService,
    TeacherChannelList,
    ChannelEditsRepo,
    ChannelEdits,
    ChannelEditsAfter,
    ChannelMedia,
    ChannelBellRepo,
    ChannelBell,
    ChannelMembers,
    ChannelReadsRepo,
    ChannelReadState,
    ChannelReadsService,
    ChannelSendInputs,
    ChannelSender,
    ChannelViews,
    ChannelSeatRepo,
    ChannelSeatService,
  ],
})
export class StudentChannelsModule {}
