import { defineRoute } from '@ab/core';
import { z } from 'zod';
import { salesAssignedCountSchema, salesPersonViewSchema } from './sales-assign.schemas';

const ACCESS = { permissions: ['leads.assign'], tags: ['sales'] } as const;

/** The admin's side of the sales portal: who owns which lead. */
export const salesAssignRoutes = {
  people: defineRoute({
    ...ACCESS,
    method: 'GET',
    path: '/sales/people',
    response: z.array(salesPersonViewSchema),
  }),
  /** Every ownerless lead, one by one, to the then least loaded salesperson. */
  assignUnassigned: defineRoute({
    ...ACCESS,
    method: 'POST',
    path: '/leads/assign-unassigned',
    response: salesAssignedCountSchema,
  }),
};
