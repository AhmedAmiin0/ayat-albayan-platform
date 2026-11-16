import { Module } from '@nestjs/common';
import { PortalModule } from '@/modules/people/portal';
import { PresenceModule } from '@/modules/people/presence';
import { TeachersModule } from '@/modules/people/teachers';
import { AccessDeps, ChannelAccess } from './channel-access';
import { CHANNEL_CONTROLLERS } from './controllers/channel.controllers';
import { ChannelEditsRepo } from './channel-edits.repo';
import { ChannelEdits } from './channel-edits.service';
import { ChannelNotify } from './channel-notify';
import { ChannelPeopleRepo } from './channel-people.repo';
import { ChannelRepo } from './channel.repo';
import { ChannelService, TeacherChannelList } from './channel.service';
import { FamilyChatSettings } from './family-chat.settings';
import { ChannelSeatRepo } from './seat/channel-seat.repo';
import { ChannelSeatService } from './seat/channel-seat.service';

/**
 * The student channel (docs/31 §2): an in-platform teacher ↔ family chat per student, opened by the
 * students INSERT trigger (migration 800); the one assistant in its seat writes too (owner
 * 2026-11-16, ChannelSeatService), student_channels.monitor only reads.
 * PushService comes from the global PushModule. Edit / delete (owner 2026-10-30): ChannelEdits.
 */
@Module({
  imports: [PortalModule, PresenceModule, TeachersModule],
  controllers: CHANNEL_CONTROLLERS,
  providers: [
    FamilyChatSettings,
    ChannelRepo,
    ChannelPeopleRepo,
    AccessDeps,
    ChannelAccess,
    ChannelNotify,
    ChannelService,
    TeacherChannelList,
    ChannelEditsRepo,
    ChannelEdits,
    ChannelSeatRepo,
    ChannelSeatService,
  ],
})
export class StudentChannelsModule {}
