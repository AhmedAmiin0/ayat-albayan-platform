import { defineRoute } from '@ab/core';
import { z } from 'zod';
import { kickQuerySchema } from '@/config/role/kick-options';

/** Calls between the api copies and the worker, never from a client (docs/62 part 3 §1). */
export const internalJobRoutes = {
  kick: defineRoute({
    method: 'POST',
    path: '/internal/jobs/:name/kick',
    params: z.object({ name: z.string() }),
    query: kickQuerySchema,
    response: 'empty',
  }),
  peerReload: defineRoute({
    method: 'POST',
    path: '/internal/jobs/config-reload/here',
    response: 'empty',
  }),
};
