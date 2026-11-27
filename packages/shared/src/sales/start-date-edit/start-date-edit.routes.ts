import { defineRoute } from '@ab/core';
import { z } from 'zod';
import { startDateEditResultSchema, startDateEditSchema } from './start-date-edit';

const access = { permissions: ['subscriptions.edit_terms'], tags: ['subscriptions'] } as const;

/** A package's first day, changed by staff with subscriptions.edit_terms. */
export const startDateEditRoutes = {
  edit: defineRoute({
    method: 'PATCH',
    path: '/subscriptions/:id/start-date',
    params: z.object({ id: z.uuid() }),
    body: startDateEditSchema,
    response: startDateEditResultSchema,
    ...access,
  }),
};
