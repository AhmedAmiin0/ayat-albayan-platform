import { defineRoute } from '@ab/core';
import { dateRangeQuery } from '../schemas';
import { dashboardWorkSchema } from './dashboard-work.schemas';
import { dashboardResponseSchema } from './dashboard.schemas';

/** The /admin home (R-RPT-01, R-RPT-02): every teacher's and family's numbers. */
export const dashboardRoutes = {
  /** `?from&to` Riyadh days, inclusive, at most a year. */
  summary: defineRoute({
    method: 'GET',
    path: '/dashboard/summary',
    query: dateRangeQuery,
    response: dashboardResponseSchema,
    permissions: ['dashboard.read'],
    tags: ['dashboard'],
  }),
  /** Pending reports, unpaid packages and open admin tasks. */
  work: defineRoute({
    method: 'GET',
    path: '/dashboard/work',
    response: dashboardWorkSchema,
    permissions: ['dashboard.read'],
    tags: ['dashboard'],
  }),
};
