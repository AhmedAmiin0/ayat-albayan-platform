import { channelPortalMessageRoutes, channelPortalRoutes, channelPresenceRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { ChannelCalls } from './channel-calls.types';

/** The family's chat with their own student's teacher; answers parsed strictly. */
export function portalChannelCalls(client: ApiClient): ChannelCalls {
  const call = callWith(client);
  return {
    page: ({ studentId, before }) =>
      call({ route: channelPortalRoutes.page, params: { id: studentId }, query: { before } }),
    presence: (id) => call({ route: channelPresenceRoutes.portal, params: { id } }),
    reads: ({ studentId, messageId }) =>
      call({ route: channelPortalMessageRoutes.reads, params: { id: studentId, messageId } }),
    remove: ({ studentId, messageId }) =>
      call({ route: channelPortalMessageRoutes.remove, params: { id: studentId, messageId } }),
  };
}
