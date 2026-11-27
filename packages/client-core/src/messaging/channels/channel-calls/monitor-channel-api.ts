import {
  channelMonitorMessageRoutes,
  channelMonitorRoutes,
  channelPresenceRoutes,
} from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { ChannelCalls } from './channel-calls.types';

/** A monitor reads any student's chat; only the admin's delete is let through by the API. */
export function monitorChannelCalls(client: ApiClient): ChannelCalls {
  const call = callWith(client);
  return {
    page: ({ studentId, before }) =>
      call({ route: channelMonitorRoutes.page, params: { id: studentId }, query: { before } }),
    presence: (id) => call({ route: channelPresenceRoutes.monitor, params: { id } }),
    reads: ({ studentId, messageId }) =>
      call({ route: channelMonitorMessageRoutes.reads, params: { id: studentId, messageId } }),
    remove: ({ studentId, messageId }) =>
      call({ route: channelMonitorMessageRoutes.remove, params: { id: studentId, messageId } }),
  };
}
