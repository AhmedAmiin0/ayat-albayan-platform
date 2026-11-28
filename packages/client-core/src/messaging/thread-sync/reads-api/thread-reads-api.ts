import { threadModeRoutes, threadReadRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { ThreadReadCalls } from './thread-reads-api.types';

/** The inbox's reads on one api client: the chats list, the phone store's sync and a chat. */
export function threadReadCalls(client: ApiClient): ThreadReadCalls {
  const call = callWith(client);
  return {
    list: (query, signal) => call({ route: threadReadRoutes.list, query, signal }),
    sync: (query) => call({ route: threadReadRoutes.sync, query }),
    page: ({ phone, query, signal }) =>
      call({ route: threadModeRoutes.page, params: { phone }, query, signal }),
    delta: ({ phone, query, signal }) =>
      call({ route: threadModeRoutes.delta, params: { phone }, query, signal }),
  };
}
