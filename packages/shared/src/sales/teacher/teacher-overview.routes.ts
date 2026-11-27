import { defineRoute, id } from '@ab/core';
import { z } from 'zod';
import { salesTeacherOverviewSchema } from './teacher-overview.schemas';

/** One teacher's weekly slots and last 30 days, read by any salesperson (docs/16 row 36b). */
export const salesTeacherOverviewRoutes = {
  overview: defineRoute({
    method: 'GET',
    path: '/sales/teachers/:id/overview',
    params: z.object({ id: id() }),
    response: salesTeacherOverviewSchema,
  }),
};
