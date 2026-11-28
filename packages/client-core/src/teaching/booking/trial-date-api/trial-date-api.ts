import { salesTrialDateRoutes, trialDateRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { TrialDateCalls } from './trial-date-api.types';

/** The admin's trial dates of any student; answers parsed strictly. */
export function trialDateCalls(client: ApiClient): TrialDateCalls {
  const call = callWith(client);
  return {
    history: (studentId) => call({ route: trialDateRoutes.history, query: { studentId } }),
    check: (body) => call({ route: trialDateRoutes.check, body }),
    pick: (body) => call({ route: trialDateRoutes.pick, body }),
  };
}

/** The sales assistant's trial dates of her own students; answers parsed strictly. */
export function salesTrialDateCalls(client: ApiClient): TrialDateCalls {
  const call = callWith(client);
  return {
    history: (studentId) => call({ route: salesTrialDateRoutes.history, query: { studentId } }),
    check: (body) => call({ route: salesTrialDateRoutes.check, body }),
    pick: (body) => call({ route: salesTrialDateRoutes.pick, body }),
  };
}
