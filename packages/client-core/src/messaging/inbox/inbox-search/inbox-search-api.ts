import { inboxSearchRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { InboxSearchCalls } from './inbox-search-api.types';

/** The inbox's message search on one api client; every page parsed strictly. */
export function inboxSearchCalls(client: ApiClient): InboxSearchCalls {
  const call = callWith(client);
  return {
    messages: (query) => call({ route: inboxSearchRoutes.messages, query }),
    chat: (params, query) => call({ route: inboxSearchRoutes.chat, params, query }),
  };
}
