import { threadReadRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { ThreadSyncCalls } from './thread-sync-api.types';

/** The phone store's sync on one api client; the envelope parsed strictly, rows kept whole. */
export function threadSyncCalls(client: ApiClient): ThreadSyncCalls {
  const call = callWith(client);
  return {
    sync: (query) => call({ route: threadReadRoutes.sync, query }),
  };
}
