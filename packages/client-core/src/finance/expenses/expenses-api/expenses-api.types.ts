import type { RouteBody, RouteQuery, RouteResult } from '@ab/core';
import type { expenseRoutes } from '@ab/shared';

type Routes = typeof expenseRoutes;
type Answer<K extends keyof Routes> = Promise<RouteResult<Routes[K]>>;

export interface ExpenseCalls {
  list: (query: RouteQuery<Routes['list']>) => Answer<'list'>;
  year: (year: string) => Answer<'year'>;
  receipt: (id: string) => Answer<'receipt'>;
  receiptUploadUrl: (body: RouteBody<Routes['receiptUploadUrl']>) => Answer<'receiptUploadUrl'>;
  create: (body: RouteBody<Routes['create']>) => Answer<'create'>;
  update: (id: string, body: RouteBody<Routes['update']>) => Answer<'update'>;
  remove: (id: string) => Answer<'remove'>;
}
