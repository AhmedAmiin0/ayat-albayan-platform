import { expenseRoutes as routes } from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';
import type { ExpenseCategoryCalls } from './expense-categories-api.types';

/** Expense categories on one api client; paths and answers from the routes. */
export function expenseCategoryCalls(client: ApiClient): ExpenseCategoryCalls {
  const call = callWith(client);
  return {
    list: () => call({ route: routes.categories }),
    add: (body) => call({ route: routes.addCategory, body }),
  };
}
