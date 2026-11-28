import { defineRoute, id } from '@ab/core';
import { z } from 'zod';
import { usedBeforeEditResultSchema, usedBeforeEditSchema } from './used-before-edit';
import { usedBeforeStateSchema } from './used-before-state';

const byId = z.object({ id: id() });
const ACCESS = { permissions: ['subscriptions.edit_terms'], tags: ['subscriptions'] } as const;

/** A package's lessons used before the platform, read and edited with subscriptions.edit_terms. */
export const usedBeforeRoutes = {
  state: defineRoute({
    ...ACCESS,
    method: 'GET',
    path: '/subscriptions/:id/lessons-used-before',
    params: byId,
    response: usedBeforeStateSchema,
  }),
  edit: defineRoute({
    ...ACCESS,
    method: 'PATCH',
    path: '/subscriptions/:id/lessons-used-before',
    params: byId,
    body: usedBeforeEditSchema,
    response: usedBeforeEditResultSchema,
  }),
};
