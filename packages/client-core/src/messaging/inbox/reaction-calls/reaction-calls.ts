import { messageReactionRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { MessageReactionCalls } from './reaction-calls.types';

/** A staff reaction on one api client; the answer is parsed strictly. */
export function messageReactionCalls(client: ApiClient): MessageReactionCalls {
  const call = callWith(client);
  return {
    react: ({ params, body }) => call({ route: messageReactionRoutes.react, params, body }),
  };
}
