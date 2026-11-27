import { assistantsRoutes as routes } from '@ab/schedule';
import { callWith, type ApiClient } from '../../../core/http';
import type { AssistantsApi } from './assistants-api.types';

/** Teaching assistants; the app keeps its own query keys. */
export function assistantsApi(client: ApiClient): AssistantsApi {
  const call = callWith(client);
  return {
    all: () => call({ route: routes.all }),
    mine: (day) => call({ route: routes.mine, query: day }),
    forStudent: (studentId) => call({ route: routes.forStudent, params: { id: studentId } }),
    assign: ({ studentId, profileId }) =>
      call({ route: routes.assign, params: { id: studentId }, body: { profileId } }),
    remove: ({ studentId, profileId }) =>
      call({ route: routes.remove, params: { id: studentId, profileId } }),
  };
}
