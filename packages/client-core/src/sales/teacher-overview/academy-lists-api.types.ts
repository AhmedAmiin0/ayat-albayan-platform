import type { RouteResult } from '@ab/core';
import type { salesAcademyListRoutes } from '@ab/shared';

type Routes = typeof salesAcademyListRoutes;
type Answer<K extends keyof Routes> = Promise<RouteResult<Routes[K]>>;

export interface SalesAcademyListCalls {
  teachers: () => Answer<'teachers'>;
  history: (id: string) => Answer<'history'>;
}
