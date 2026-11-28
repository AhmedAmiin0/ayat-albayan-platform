import { chatListRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { ChatListCalls } from './chat-lists-api.types';

/** The shared chat lists' calls on one api client (docs/22 §3); answers parsed strictly. */
export function chatListCalls(client: ApiClient): ChatListCalls {
  const call = callWith(client);
  return {
    all: () => call({ route: chatListRoutes.all }),
    create: (name) => call({ route: chatListRoutes.create, body: { name } }),
    rename: ({ id, name }) =>
      call({ route: chatListRoutes.rename, params: { id }, body: { name } }),
    remove: (id) => call({ route: chatListRoutes.remove, params: { id } }),
    addThread: (params) => call({ route: chatListRoutes.addThread, params }),
    dropThread: (params) => call({ route: chatListRoutes.dropThread, params }),
  };
}
