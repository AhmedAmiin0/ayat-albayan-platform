import { adminTaskRoutes as routes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { AdminTaskCalls } from './admin-tasks-api.types';

/** Admin tasks (S7, S8) on one api client; paths and answers from the routes. */
export function adminTaskCalls(client: ApiClient): AdminTaskCalls {
  const call = callWith(client);
  return {
    list: (query) => call({ route: routes.list, query }),
    done: (id) => call({ route: routes.done, params: { id } }),
  };
}
