import { customConfigRoutes } from '@ab/settings';
import { callWith, type ApiClient } from '../../../core/http';
import type { CustomConfigCalls } from './custom-config-api.types';

/** The free-form custom values (admin); the API audits every write. */
export function customConfigCalls(client: ApiClient): CustomConfigCalls {
  const call = callWith(client);
  return {
    list: () => call({ route: customConfigRoutes.list }),
    put: ({ key, body }) => call({ route: customConfigRoutes.put, params: { key }, body }),
    remove: (key) => call({ route: customConfigRoutes.remove, params: { key } }),
  };
}
