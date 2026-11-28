import type { RouteResult } from '@ab/core';
import type { AdminTaskListQueryInput, adminTaskRoutes } from '@ab/shared';

type Answer<K extends keyof typeof adminTaskRoutes> = Promise<
  RouteResult<(typeof adminTaskRoutes)[K]>
>;

export interface AdminTaskCalls {
  list: (query: AdminTaskListQueryInput) => Answer<'list'>;
  done: (id: string) => Answer<'done'>;
}
