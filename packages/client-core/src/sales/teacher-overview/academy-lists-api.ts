import { salesAcademyListRoutes, salesAcademyStudentRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';
import type { SalesAcademyListCalls } from './academy-lists-api.types';

/** The teachers, every student and a subscription's history for a salesperson. */
export function salesAcademyListCalls(client: ApiClient): SalesAcademyListCalls {
  const call = callWith(client);
  return {
    teachers: () => call({ route: salesAcademyListRoutes.teachers }),
    history: (id) => call({ route: salesAcademyListRoutes.history, params: { id } }),
    students: (query) => call({ route: salesAcademyStudentRoutes.students, query }),
  };
}
