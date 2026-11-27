import { ChannelEditsController } from './channel.edits.controller';
import { ChannelFilesController } from './channel.files.controller';
import { ChannelPresenceController } from './channel.presence.controller';
import { SalesChannelController } from './channel.sales.controller';
import {
  MonitorChannelController,
  PortalChannelController,
  TeacherChannelsController,
} from './channel.threads.controller';

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
