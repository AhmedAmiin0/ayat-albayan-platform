import { defineRoute } from '@ab/core';
import { settingsMetaResponseSchema } from './meta.schemas';

/** The legacy path and its 'config' tag are kept on purpose. */
export const settingsMetaRoutes = {
  view: defineRoute({
    method: 'GET',
    path: '/config/meta',
    response: settingsMetaResponseSchema,
    permissions: ['settings.read'],
    tags: ['config'],
  }),
};
