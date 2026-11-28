import { defineRoute } from '@ab/core';
import { z } from 'zod';
import { PUBLIC_CONFIG_PATH } from './public-config';
import { publicConfigSchema } from './public-config-schema';
import { customConfigUpsertSchema, customKeySchema } from './schema';
import { customConfigViewSchema } from './views.schemas';

const PATH = '/config/custom/:key';
const tags = ['config'] as const;
const writer = { permissions: ['settings.write'], tags } as const;
const params = z.object({ key: customKeySchema });

/** The free-form entries (admin); every write is audited by the API. */
export const customConfigRoutes = {
  list: defineRoute({
    method: 'GET',
    path: '/config/custom',
    response: z.array(customConfigViewSchema),
    permissions: ['settings.read'],
    tags,
  }),
  put: defineRoute({
    method: 'PUT',
    path: PATH,
    params,
    body: customConfigUpsertSchema,
    response: customConfigViewSchema,
    ...writer,
  }),
  remove: defineRoute({ method: 'DELETE', path: PATH, params, response: 'empty', ...writer }),
};

/** The public settings and public custom values every app reads, before and after login. */
export const publicConfigRoutes = {
  get: defineRoute({
    method: 'GET',
    path: PUBLIC_CONFIG_PATH,
    response: publicConfigSchema,
    tags: ['settings'],
    isPublic: true,
  }),
};
