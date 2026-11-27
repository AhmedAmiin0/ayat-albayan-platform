import { integrationRoutes } from '@ab/catalog';
import { callWith, type ApiClient } from '../../../core/http';
import type { IntegrationCalls } from './integrations-api.types';

/** Integration keys (admin): a secret is write-only and never in an answer. */
export function integrationCalls(client: ApiClient): IntegrationCalls {
  const call = callWith(client);
  return {
    list: () => call({ route: integrationRoutes.list }),
    saveValues: (body) => call({ route: integrationRoutes.saveValues, body }),
    saveSecret: ({ key, value }) =>
      call({ route: integrationRoutes.saveSecret, params: { key }, body: { value } }),
    clearSecret: (key) => call({ route: integrationRoutes.clearSecret, params: { key } }),
    probeStorage: () => call({ route: integrationRoutes.storageProbe }),
  };
}
