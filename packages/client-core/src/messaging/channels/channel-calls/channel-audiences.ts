import type { ApiClient } from '../../../core/http';
import type { ChannelAudience } from '../channels';
import type { ChannelCalls, ChannelWriteCalls } from './channel-calls.types';
import type { ChannelWriter } from './channel-writer.schemas';
import { monitorChannelCalls } from './monitor-channel-api';
import { portalChannelCalls, portalChannelWrites } from './portal-channel-api';
import { salesChannelCalls, salesChannelWrites } from './sales-channel-api';
import { teacherChannelCalls, teacherChannelWrites } from './teacher-channel-api';

/** Each audience's own route table; the shared chat screens pick theirs by audience. */
export const channelCallsByAudience = (
  client: ApiClient,
): Readonly<Record<ChannelAudience, ChannelCalls>> => ({
  teacher: teacherChannelCalls(client),
  portal: portalChannelCalls(client),
  admin: monitorChannelCalls(client),
  sales: salesChannelCalls(client),
});

/** Each writer's own write routes, picked with channelWriterOf. */
export const channelWritesByAudience = (
  client: ApiClient,
): Readonly<Record<ChannelWriter, ChannelWriteCalls>> => ({
  teacher: teacherChannelWrites(client),
  portal: portalChannelWrites(client),
  sales: salesChannelWrites(client),
});
