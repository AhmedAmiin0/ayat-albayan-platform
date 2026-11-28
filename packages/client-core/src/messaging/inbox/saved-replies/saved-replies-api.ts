import { savedReplyRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { SavedReplyCalls } from './saved-replies-api.types';

/** The saved replies' calls on one api client; nothing here sends a message. */
export function savedReplyCalls(client: ApiClient): SavedReplyCalls {
  const call = callWith(client);
  return {
    all: () => call({ route: savedReplyRoutes.all }),
    create: (body) => call({ route: savedReplyRoutes.create, body }),
    update: ({ id, body }) => call({ route: savedReplyRoutes.update, params: { id }, body }),
    remove: (id) => call({ route: savedReplyRoutes.remove, params: { id } }),
    move: ({ id, direction }) =>
      call({ route: savedReplyRoutes.move, params: { id }, body: { direction } }),
    stage: ({ id, clientRequestId }) =>
      call({ route: savedReplyRoutes.stage, params: { id }, body: { clientRequestId } }),
    uploadUrl: (body) => call({ route: savedReplyRoutes.uploadUrl, body }),
  };
}
