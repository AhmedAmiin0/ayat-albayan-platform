import { salesAcademyListRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';
import type { SalesAcademyListCalls } from './academy-lists-api.types';

/** The teachers and a subscription's history for a salesperson, on one api client. */
export function salesAcademyListCalls(client: ApiClient): SalesAcademyListCalls {
  const call = callWith(client);
  return {
    teachers: () => call({ route: salesAcademyListRoutes.teachers }),
    history: (id) => call({ route: salesAcademyListRoutes.history, params: { id } }),
  };
}
