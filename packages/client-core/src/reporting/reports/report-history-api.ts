import { reportHistoryRoutes as routes } from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';
import type { ReportHistoryCalls } from './report-history-api.types';

/** A student's report history and a teacher's own report lists (docs/11 §4 R5, R11). */
export function reportHistoryCalls(client: ApiClient): ReportHistoryCalls {
  const call = callWith(client);
  return {
    student: (params, query) => call({ route: routes.student, params, query }),
    pending: () => call({ route: routes.pending }),
    mine: (query) => call({ route: routes.mine, query }),
  };
}
