import { defineRoute, id } from '@ab/core';
import { z } from 'zod';
import { horizonRunSummarySchema, ruleExtendResultSchema } from './schedule-rules.schemas';
import { ruleExtendRequestSchema } from './scheduling';

const access = { permissions: ['lessons.write'], tags: ['schedule-rules'] } as const;

/** The weekly rules' admin routes (R-SCH-02), written once for the api and its clients. */
export const scheduleRuleRoutes = {
  /** The daily horizon pass now, so rule changes show without waiting; idempotent. */
  refresh: defineRoute({
    method: 'POST',
    path: '/schedule-rules/refresh',
    response: horizonRunSummarySchema,
    ...access,
  }),
  /** Weeks ahead from now; no body tops up by the settings' horizon. Never blocks on a clash. */
  extend: defineRoute({
    method: 'POST',
    path: '/schedule-rules/:id/extend',
    params: z.object({ id: id() }),
    body: ruleExtendRequestSchema.prefault({}),
    response: ruleExtendResultSchema,
    ...access,
  }),
};
