import { leadReadRoutes as routes } from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';
import type { LeadReadCalls } from './leads-api.types';

/** The admin's lead inbox, on one api client (R-LEAD-01). */
export function leadReadCalls(client: ApiClient): LeadReadCalls {
  const call = callWith(client);
  return {
    list: (query) => call({ route: routes.list, query }),
  };
}
