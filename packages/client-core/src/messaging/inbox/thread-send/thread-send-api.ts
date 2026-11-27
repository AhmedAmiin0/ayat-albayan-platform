import { threadSendRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { ThreadSendCalls } from './thread-send-api.types';

/** A chat's text and template sends on one api client; answers parsed strictly. */
export function threadSendCalls(client: ApiClient): ThreadSendCalls {
  const call = callWith(client);
  return {
    text: ({ params, body }) => call({ route: threadSendRoutes.text, params, body }),
    template: ({ params, body }) => call({ route: threadSendRoutes.template, params, body }),
  };
}
