import { expenseRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { ExpenseCalls } from './expenses-api.types';

/** Expenses on one api client; paths and answers from the routes. */
export function expenseCalls(client: ApiClient): ExpenseCalls {
  const call = callWith(client);
  return {
    list: (query) => call({ route: expenseRoutes.list, query }),
    year: (year) => call({ route: expenseRoutes.year, query: { year } }),
    receipt: (id) => call({ route: expenseRoutes.receipt, params: { id } }),
    receiptUploadUrl: (body) => call({ route: expenseRoutes.receiptUploadUrl, body }),
    create: (body) => call({ route: expenseRoutes.create, body }),
    update: (id, body) => call({ route: expenseRoutes.update, params: { id }, body }),
    remove: (id) => call({ route: expenseRoutes.remove, params: { id } }),
  };
}
