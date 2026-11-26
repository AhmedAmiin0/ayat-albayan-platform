import { defineRoute, id, pageOf } from '@ab/core';
import { adminTaskViewSchema } from '@ab/money';
import { z } from 'zod';
import { adminTaskListQuerySchema } from './admin-tasks.schemas';

/** Admin tasks raised by the R-SUB-02 alerts (S7, S8), written once for the api and its clients. */
export const adminTaskRoutes = {
  list: defineRoute({
    method: 'GET',
    path: '/admin-tasks',
    query: adminTaskListQuerySchema,
    response: pageOf(adminTaskViewSchema),
  }),
  done: defineRoute({
    method: 'POST',
    path: '/admin-tasks/:id/done',
    params: z.object({ id: id() }),
    response: adminTaskViewSchema,
  }),
};
