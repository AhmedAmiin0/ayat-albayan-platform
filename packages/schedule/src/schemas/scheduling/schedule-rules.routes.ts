import { defineRoute } from '@ab/core';
import { horizonRunSummarySchema } from './schedule-rules.schemas';

/** The weekly rules' admin routes (R-SCH-02), written once for the api and its clients. */
export const scheduleRuleRoutes = {
  /** The daily horizon pass now, so rule changes show without waiting; idempotent. */
  refresh: defineRoute({
    method: 'POST',
    path: '/schedule-rules/refresh',
    response: horizonRunSummarySchema,
  }),
};
