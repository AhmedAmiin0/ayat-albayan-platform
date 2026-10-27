import { MonitorChannelController } from './channel.monitor.controller';
import { PortalChannelController } from './channel.portal.controller';
import { TeacherChannelsController } from './channel.teacher.controller';

/** Every controller of the student channel: participants (teacher, family) and monitors (admin, sales). */
export const CHANNEL_CONTROLLERS = [TeacherChannelsController, PortalChannelController, MonitorChannelController];
