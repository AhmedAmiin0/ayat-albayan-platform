import type { RouteQuery, RouteResult } from '@ab/core';
import type { threadReadRoutes } from '@ab/shared';

type SyncRoute = typeof threadReadRoutes.sync;

export interface ThreadSyncCalls {
  sync: (query: RouteQuery<SyncRoute>) => Promise<RouteResult<SyncRoute>>;
}
