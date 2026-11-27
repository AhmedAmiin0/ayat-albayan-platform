import type { ApiClient } from '../../../core/http';
import type { ChannelAudience } from '../channels';
import type { ChannelCalls } from './channel-calls.types';
import { monitorChannelCalls } from './monitor-channel-api';
import { portalChannelCalls } from './portal-channel-api';
import { salesChannelCalls } from './sales-channel-api';
import { teacherChannelCalls } from './teacher-channel-api';

/** Each audience's own route table; the shared chat screens pick theirs by audience. */
export const channelCallsByAudience = (
  client: ApiClient,
): Readonly<Record<ChannelAudience, ChannelCalls>> => ({
  teacher: teacherChannelCalls(client),
  portal: portalChannelCalls(client),
  admin: monitorChannelCalls(client),
  sales: salesChannelCalls(client),
});
