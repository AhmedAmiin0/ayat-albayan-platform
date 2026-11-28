import { messageStatusRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { MessageStatusCalls } from './message-status-api.types';

/** The send gate and what staff do with an outbound message that did not go out. */
export function messageStatusCalls(client: ApiClient): MessageStatusCalls {
  const call = callWith(client);
  return {
    gate: () => call({ route: messageStatusRoutes.gate }),
    retry: (id) => call({ route: messageStatusRoutes.retry, params: { id } }),
    sentManually: (id) => call({ route: messageStatusRoutes.sentManually, params: { id } }),
    appSend: (id) => call({ route: messageStatusRoutes.appSend, params: { id } }),
    handOff: (id) => call({ route: messageStatusRoutes.handOff, params: { id } }),
  };
}
