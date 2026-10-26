import { Module } from '@nestjs/common';
import { PortalModule } from '../../people/portal';
import { TeachersModule } from '../../people/teachers';
import { AccessDeps, ChannelAccess } from './channel-access';
import { CHANNEL_CONTROLLERS } from './channel.controllers';
import { ChannelNotify } from './channel-notify';
import { ChannelPeopleQueries } from './channel-people.queries';
import { ChannelQueries } from './channel.queries';
import { ChannelService, TeacherChannelList } from './channel.service';

/**
 * The student channel (docs/31 §2): an in-platform teacher ↔ family chat per student, opened by the
 * students INSERT trigger (migration 800), read-only for the owning assistant and student_channels.monitor.
 * PushService comes from the global PushModule.
 */
@Module({
  imports: [PortalModule, TeachersModule],
  controllers: CHANNEL_CONTROLLERS,
  providers: [ChannelQueries, ChannelPeopleQueries, AccessDeps, ChannelAccess, ChannelNotify, ChannelService, TeacherChannelList],
})
export class StudentChannelsModule {}
