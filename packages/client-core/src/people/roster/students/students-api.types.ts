import type { RouteBody, RouteQuery, RouteResult } from '@ab/core';
import type { studentRoutes } from '@ab/shared';

type Routes = typeof studentRoutes;
type Answer<K extends keyof Routes> = Promise<RouteResult<Routes[K]>>;

/** POST /students as the clients send it. */
export type StudentCreateBody = RouteBody<Routes['create']>;

export interface MergeStudents {
  keptId: string;
  mergedId: string;
}

export interface StudentCalls {
  list: (query: RouteQuery<Routes['list']>) => Answer<'list'>;
  get: (id: string) => Answer<'get'>;
  teacherOptions: () => Answer<'teacherOptions'>;
  statusCounts: (filters: RouteQuery<Routes['statusCounts']>) => Answer<'statusCounts'>;
  create: (body: StudentCreateBody) => Answer<'create'>;
  update: (id: string, patch: RouteBody<Routes['update']>) => Answer<'update'>;
  merge: (pair: MergeStudents) => Answer<'merge'>;
}
