import { ChannelEditsController } from './channel.edits.controller';
import { ChannelFilesController } from './channel.files.controller';
import { MonitorChannelController } from './channel.monitor.controller';
import { PortalChannelController } from './channel.portal.controller';
import { ChannelPresenceController } from './channel.presence.controller';
import { SalesChannelController } from './channel.sales.controller';
import { TeacherChannelsController } from './channel.teacher.controller';

/**
 * Every controller of the student channel: participants (teacher, family, the seated assistant),
 * the pages (the admin monitor, the assistant's), edit / delete for everyone, presence (docs/33),
 * files and read info (the chat upgrade).
 */
export const CHANNEL_CONTROLLERS = [
  TeacherChannelsController,
  PortalChannelController,
  SalesChannelController,
  MonitorChannelController,
  ChannelEditsController,
  ChannelPresenceController,
  ChannelFilesController,
];
