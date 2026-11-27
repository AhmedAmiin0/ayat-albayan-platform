import { threadReadRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { ThreadReadCalls } from './thread-reads-api.types';

/** The inbox's reads on one api client: the chats list and the phone store's sync. */
export function threadReadCalls(client: ApiClient): ThreadReadCalls {
  const call = callWith(client);
  return {
    list: (query, signal) => call({ route: threadReadRoutes.list, query, signal }),
    sync: (query) => call({ route: threadReadRoutes.sync, query }),
  };
}
