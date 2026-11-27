import { salesAcademyDayRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';
import type { SalesAcademyDayCalls } from './academy-day-api.types';

/** The academy day and its running lessons for a salesperson, on one api client. */
export function salesAcademyDayCalls(client: ApiClient): SalesAcademyDayCalls {
  const call = callWith(client);
  return {
    day: (query) => call({ route: salesAcademyDayRoutes.day, query }),
    live: () => call({ route: salesAcademyDayRoutes.live }),
  };
}
