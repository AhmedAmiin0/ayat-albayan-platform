import { ChannelEditsController } from './channel.edits.controller';
import { MonitorChannelController } from './channel.monitor.controller';
import { PortalChannelController } from './channel.portal.controller';
import { ChannelPresenceController } from './channel.presence.controller';
import { TeacherChannelsController } from './channel.teacher.controller';

/**
 * Every controller of the student channel: participants (teacher, family), monitors (admin, sales),
 * edit / delete for everyone (owner 2026-10-30) and presence (docs/33).
 */
export const CHANNEL_CONTROLLERS = [
  TeacherChannelsController,
  PortalChannelController,
  MonitorChannelController,
  ChannelEditsController,
  ChannelPresenceController,
];
