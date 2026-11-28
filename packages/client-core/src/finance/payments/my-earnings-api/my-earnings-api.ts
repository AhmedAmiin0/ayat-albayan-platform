import { myEarningRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { MyEarningCalls } from './my-earnings-api.types';

/** The signed-in teacher's own earnings; the api takes the teacher from the token. */
export function myEarningCalls(client: ApiClient): MyEarningCalls {
  const call = callWith(client);
  return {
    balance: () => call({ route: myEarningRoutes.balance }),
    sessions: (query) => call({ route: myEarningRoutes.sessions, query }),
    payments: (query) => call({ route: myEarningRoutes.payments, query }),
    receipt: (id) => call({ route: myEarningRoutes.receipt, params: { id } }),
  };
}
