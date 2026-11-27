import type { RouteBody, RouteResult } from '@ab/core';
import type { teacherRoutes } from '@ab/shared';

type Routes = typeof teacherRoutes;
type Answer<K extends keyof Routes> = Promise<RouteResult<Routes[K]>>;

export interface TeacherCalls {
  get: (id: string) => Answer<'get'>;
  create: (body: RouteBody<Routes['create']>) => Answer<'create'>;
  update: (id: string, patch: RouteBody<Routes['update']>) => Answer<'update'>;
}
