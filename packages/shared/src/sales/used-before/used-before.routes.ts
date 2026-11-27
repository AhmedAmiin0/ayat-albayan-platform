import { defineRoute, id } from '@ab/core';
import { z } from 'zod';
import { usedBeforeEditResultSchema, usedBeforeEditSchema } from './used-before-edit';
import { usedBeforeStateSchema } from './used-before-state';

const byId = z.object({ id: id() });

/** A package's lessons used before the platform, read and edited with subscriptions.edit_terms. */
export const usedBeforeRoutes = {
  state: defineRoute({
    method: 'GET',
    path: '/subscriptions/:id/lessons-used-before',
    params: byId,
    response: usedBeforeStateSchema,
  }),
  edit: defineRoute({
    method: 'PATCH',
    path: '/subscriptions/:id/lessons-used-before',
    params: byId,
    body: usedBeforeEditSchema,
    response: usedBeforeEditResultSchema,
  }),
};
