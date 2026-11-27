import type { RouteBody, RouteResult } from '@ab/core';
import type { salesTrialDateRoutes, trialDateRoutes } from '@ab/shared';

type Routes = typeof trialDateRoutes | typeof salesTrialDateRoutes;
type Answer<K extends keyof Routes> = Promise<RouteResult<Routes[K]>>;

export interface TrialDateCalls {
  history: (studentId: string) => Answer<'history'>;
  check: (body: RouteBody<Routes['check']>) => Answer<'check'>;
  pick: (body: RouteBody<Routes['pick']>) => Answer<'pick'>;
}
