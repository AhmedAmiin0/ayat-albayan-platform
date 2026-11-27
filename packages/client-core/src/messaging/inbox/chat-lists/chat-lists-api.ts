import { chatListRoutes as routes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { ChatListCalls } from './chat-lists-api.types';

/** The shared chat lists' calls on one api client (docs/22 §3); answers parsed strictly. */
export function chatListCalls(client: ApiClient): ChatListCalls {
  const call = callWith(client);
  return {
    all: () => call({ route: routes.all }),
    create: (name) => call({ route: routes.create, body: { name } }),
    rename: ({ id, name }) => call({ route: routes.rename, params: { id }, body: { name } }),
    remove: (id) => call({ route: routes.remove, params: { id } }),
    setMember: ({ id, phone, member }) =>
      call({ route: member ? routes.addThread : routes.dropThread, params: { id, phone } }),
  };
}
