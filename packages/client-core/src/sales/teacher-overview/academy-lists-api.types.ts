import type { RouteQuery, RouteResult } from '@ab/core';
import type { salesAcademyListRoutes, salesAcademyStudentRoutes } from '@ab/shared';

type Routes = typeof salesAcademyListRoutes;
type Answer<K extends keyof Routes> = Promise<RouteResult<Routes[K]>>;
type StudentsRoute = (typeof salesAcademyStudentRoutes)['students'];

export type SalesAllStudentsQuery = RouteQuery<StudentsRoute>;

export interface SalesAcademyListCalls {
  teachers: () => Answer<'teachers'>;
  history: (id: string) => Answer<'history'>;
  students: (query: SalesAllStudentsQuery) => Promise<RouteResult<StudentsRoute>>;
}
