import type { RouteResult } from '@ab/core';
import type { salesAssignRoutes } from '@ab/shared';

type Answer<K extends keyof typeof salesAssignRoutes> = Promise<
  RouteResult<(typeof salesAssignRoutes)[K]>
>;

export interface SalesAssignCalls {
  people: () => Answer<'people'>;
  assignUnassigned: () => Answer<'assignUnassigned'>;
}
