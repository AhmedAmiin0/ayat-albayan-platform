import { channelSalesMessageRoutes, channelSalesRoutes, channelPresenceRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { ChannelCalls, ChannelWriteCalls } from './channel-calls.types';

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

/** The assistant's send, read mark, file slot and edit while holding its seat. */
export function salesChannelWrites(client: ApiClient): ChannelWriteCalls {
  const call = callWith(client);
  return {
    post: ({ studentId, post }) =>
      call({ route: channelSalesRoutes.post, params: { id: studentId }, body: post }),
    read: ({ studentId, at }) =>
      call({ route: channelSalesRoutes.read, params: { id: studentId }, body: { at } }),
    upload: ({ studentId, file }) =>
      call({ route: channelSalesMessageRoutes.upload, params: { id: studentId }, body: file }),
    edit: ({ studentId, messageId, body }) =>
      call({
        route: channelSalesMessageRoutes.edit,
        params: { id: studentId, messageId },
        body: { body },
      }),
  };
}
