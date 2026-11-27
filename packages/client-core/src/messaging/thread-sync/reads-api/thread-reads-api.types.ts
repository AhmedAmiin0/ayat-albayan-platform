import type { RouteQuery, RouteResult } from '@ab/core';
import type { threadReadRoutes } from '@ab/shared';

type ListRoute = typeof threadReadRoutes.list;
type SyncRoute = typeof threadReadRoutes.sync;

export interface ThreadReadCalls {
  list: (
    query: RouteQuery<ListRoute>,
    signal?: AbortSignal,
  ) => Promise<RouteResult<ListRoute>>;
  sync: (query: RouteQuery<SyncRoute>) => Promise<RouteResult<SyncRoute>>;
}
