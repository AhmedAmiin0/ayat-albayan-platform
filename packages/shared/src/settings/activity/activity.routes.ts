import { defineRoute } from '@ab/core';
import { activityListQuery } from '../../schemas';
import { activityPageSchema } from './activity.schemas';

/** The admin activity log (R-NFR-08). */
export const activityRoutes = {
  list: defineRoute({
    method: 'GET',
    path: '/activity',
    query: activityListQuery,
    response: activityPageSchema,
    permissions: ['activity.read'],
    tags: ['activity'],
  }),
};
