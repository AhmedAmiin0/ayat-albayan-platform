import { usedBeforeRoutes as routes } from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';
import type { UsedBeforeCalls } from './used-before-api.types';

/** A package's lessons used before the platform, on one api client. */
export function usedBeforeCalls(client: ApiClient): UsedBeforeCalls {
  const call = callWith(client);
  return {
    state: (id) => call({ route: routes.state, params: { id } }),
    edit: ({ id, lessonsUsedBefore }) =>
      call({ route: routes.edit, params: { id }, body: { lessonsUsedBefore } }),
  };
}
