import type { RouteBody, RouteResult } from '@ab/core';
import type { expenseRoutes } from '@ab/shared';

type Routes = typeof expenseRoutes;

export interface ExpenseCategoryCalls {
  list: () => Promise<RouteResult<Routes['categories']>>;
  add: (body: RouteBody<Routes['addCategory']>) => Promise<RouteResult<Routes['addCategory']>>;
}
