import { threadForwardRoutes as routes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { ThreadForwardCalls } from './thread-forward-api.types';

/** Forwarding one message to other chats, on one api client. */
export function threadForwardCalls(client: ApiClient): ThreadForwardCalls {
  const call = callWith(client);
  return {
    forward: (body) => call({ route: routes.forward, body }),
  };
}
