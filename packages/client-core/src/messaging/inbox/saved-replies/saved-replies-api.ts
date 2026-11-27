import { savedReplyRoutes as routes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { SavedReplyCalls } from './saved-replies-api.types';

/** The saved replies' calls on one api client; nothing here sends a message. */
export function savedReplyCalls(client: ApiClient): SavedReplyCalls {
  const call = callWith(client);
  return {
    all: () => call({ route: routes.all }),
    create: (body) => call({ route: routes.create, body }),
    update: ({ id, body }) => call({ route: routes.update, params: { id }, body }),
    remove: (id) => call({ route: routes.remove, params: { id } }),
    move: ({ id, direction }) => call({ route: routes.move, params: { id }, body: { direction } }),
    stage: ({ id, clientRequestId }) =>
      call({ route: routes.stage, params: { id }, body: { clientRequestId } }),
    uploadUrl: (body) => call({ route: routes.uploadUrl, body }),
  };
}
