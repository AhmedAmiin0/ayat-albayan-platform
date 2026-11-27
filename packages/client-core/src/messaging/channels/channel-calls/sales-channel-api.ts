import { channelSalesMessageRoutes, channelSalesRoutes, channelPresenceRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { ChannelCalls } from './channel-calls.types';

/** The assistant's chat while holding its seat; answers parsed strictly. */
export function salesChannelCalls(client: ApiClient): ChannelCalls {
  const call = callWith(client);
  return {
    page: ({ studentId, before }) =>
      call({ route: channelSalesRoutes.page, params: { id: studentId }, query: { before } }),
    presence: (id) => call({ route: channelPresenceRoutes.sales, params: { id } }),
    reads: ({ studentId, messageId }) =>
      call({ route: channelSalesMessageRoutes.reads, params: { id: studentId, messageId } }),
    remove: ({ studentId, messageId }) =>
      call({ route: channelSalesMessageRoutes.remove, params: { id: studentId, messageId } }),
  };
}
