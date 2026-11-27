import { configEntriesRoutes } from '@ab/settings';
import { callWith, type ApiClient } from '../../../core/http';
import type { ConfigEntryCalls } from './config-entries-api.types';

/** The values page rows (docs/26 §2f): versioned saves and the admin's description. */
export function configEntryCalls(client: ApiClient): ConfigEntryCalls {
  const call = callWith(client);
  return {
    list: () => call({ route: configEntriesRoutes.list }),
    patch: ({ key, body }) => call({ route: configEntriesRoutes.patch, params: { key }, body }),
    describe: ({ key, text }) =>
      call({ route: configEntriesRoutes.describe, params: { key }, body: { text } }),
  };
}
