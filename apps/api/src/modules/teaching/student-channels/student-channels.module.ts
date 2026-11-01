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

/**
 * The student channel (docs/31 §2): an in-platform teacher ↔ family chat per student, opened by the
 * students INSERT trigger (migration 800), read-only for the owning assistant and student_channels.monitor.
 * PushService comes from the global PushModule. Edit / delete (owner 2026-10-30): ChannelEdits.
 */
@Module({
  imports: [PortalModule, PresenceModule, TeachersModule],
  controllers: CHANNEL_CONTROLLERS,
  providers: [ChannelRepo, ChannelPeopleRepo, AccessDeps, ChannelAccess, ChannelNotify, ChannelService, TeacherChannelList, ChannelEditsRepo, ChannelEdits],
})
export class StudentChannelsModule {}
