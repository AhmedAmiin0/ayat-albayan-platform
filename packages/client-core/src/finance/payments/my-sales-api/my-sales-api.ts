import { mySalesRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { MySalesCalls } from './my-sales-api.types';

/** The signed-in assistant's own pages; the api takes the assistant from the token. */
export function mySalesCalls(client: ApiClient): MySalesCalls {
  const call = callWith(client);
  return {
    students: () => call({ route: mySalesRoutes.students }),
    earnings: () => call({ route: mySalesRoutes.earnings }),
    commissions: (query) => call({ route: mySalesRoutes.commissions, query }),
    payments: () => call({ route: mySalesRoutes.payments }),
  };
}
