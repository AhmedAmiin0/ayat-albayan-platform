import type { RouteQuery, RouteResult } from '@ab/core';
import type { threadModeRoutes, threadReadRoutes } from '@ab/shared';

type ListRoute = typeof threadReadRoutes.list;
type SyncRoute = typeof threadReadRoutes.sync;
export type ThreadPageRoute = typeof threadModeRoutes.page;
export type ThreadDeltaRoute = typeof threadModeRoutes.delta;
export type ThreadPageQuery = RouteQuery<ThreadPageRoute>;
export type ThreadDeltaQuery = RouteQuery<ThreadDeltaRoute>;

/** One ask of an open chat: its phone, the mode's query and TanStack's signal. */
export interface ChatAsk<R extends ThreadPageRoute | ThreadDeltaRoute> {
  phone: string;
  query: RouteQuery<R>;
  signal?: AbortSignal;
}

export interface ThreadReadCalls {
  list: (query: RouteQuery<ListRoute>, signal?: AbortSignal) => Promise<RouteResult<ListRoute>>;
  sync: (query: RouteQuery<SyncRoute>) => Promise<RouteResult<SyncRoute>>;
  page: (ask: ChatAsk<ThreadPageRoute>) => Promise<RouteResult<ThreadPageRoute>>;
  delta: (ask: ChatAsk<ThreadDeltaRoute>) => Promise<RouteResult<ThreadDeltaRoute>>;
}
