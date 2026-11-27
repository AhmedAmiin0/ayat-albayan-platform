import { defineRoute } from '@ab/core';
import { jobStatusListSchema } from '@ab/shared';

/** The job beats admins read; no client app calls it yet (docs/62 part 3 §1). */
export const jobsStatusRoutes = {
  list: defineRoute({
    method: 'GET',
    path: '/admin/jobs',
    response: jobStatusListSchema,
    permissions: ['settings.write'],
    tags: ['settings'],
  }),
};
