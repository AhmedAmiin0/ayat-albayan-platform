import { expenseRoutes as routes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { ExpenseCalls } from './expenses-api.types';

/** Expenses on one api client; paths and answers from the routes. */
export function expenseCalls(client: ApiClient): ExpenseCalls {
  const call = callWith(client);
  return {
    list: (query) => call({ route: routes.list, query }),
    year: (year) => call({ route: routes.year, query: { year } }),
    receipt: (id) => call({ route: routes.receipt, params: { id } }),
    receiptUploadUrl: (body) => call({ route: routes.receiptUploadUrl, body }),
    create: (body) => call({ route: routes.create, body }),
    update: (id, body) => call({ route: routes.update, params: { id }, body }),
    remove: (id) => call({ route: routes.remove, params: { id } }),
  };
}
