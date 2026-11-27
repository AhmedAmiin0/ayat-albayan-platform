import type { RouteBody, RouteQuery, RouteResult } from '@ab/core';
import type { studentRoutes } from '@ab/shared';

type Routes = typeof studentRoutes;
type Answer<K extends keyof Routes> = Promise<RouteResult<Routes[K]>>;

export interface MergeStudents {
  keptId: string;
  mergedId: string;
}

export interface StudentCalls {
  get: (id: string) => Answer<'get'>;
  teacherOptions: () => Answer<'teacherOptions'>;
  statusCounts: (filters: RouteQuery<Routes['statusCounts']>) => Answer<'statusCounts'>;
  create: (body: RouteBody<Routes['create']>) => Answer<'create'>;
  update: (id: string, patch: RouteBody<Routes['update']>) => Answer<'update'>;
  merge: (pair: MergeStudents) => Answer<'merge'>;
}
