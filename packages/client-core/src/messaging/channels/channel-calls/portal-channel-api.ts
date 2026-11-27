import { channelPortalMessageRoutes, channelPortalRoutes, channelPresenceRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { ChannelCalls, ChannelWriteCalls } from './channel-calls.types';

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

/** The family's send, read mark, file slot and edit. */
export function portalChannelWrites(client: ApiClient): ChannelWriteCalls {
  const call = callWith(client);
  return {
    post: ({ studentId, post }) =>
      call({ route: channelPortalRoutes.post, params: { id: studentId }, body: post }),
    read: ({ studentId, at }) =>
      call({ route: channelPortalRoutes.read, params: { id: studentId }, body: { at } }),
    upload: ({ studentId, file }) =>
      call({ route: channelPortalMessageRoutes.upload, params: { id: studentId }, body: file }),
    edit: ({ studentId, messageId, body }) =>
      call({
        route: channelPortalMessageRoutes.edit,
        params: { id: studentId, messageId },
        body: { body },
      }),
  };
}
