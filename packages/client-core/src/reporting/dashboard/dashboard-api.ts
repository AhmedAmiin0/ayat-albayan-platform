import { dashboardRoutes } from '@ab/money';
import { callWith, type ApiClient } from '../../core/http';
import type { DashboardCalls } from './dashboard-api.types';

/** The /admin home's reads on one api client (R-RPT-01, R-RPT-02). */
export function dashboardCalls(client: ApiClient): DashboardCalls {
  const call = callWith(client);
  return {
    summary: (query) => call({ route: dashboardRoutes.summary, query }),
    work: () => call({ route: dashboardRoutes.work }),
  };
}
