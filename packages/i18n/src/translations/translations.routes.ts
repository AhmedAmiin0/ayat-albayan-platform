import { defineRoute } from '@ab/core';
import {
  translationKeyParamsSchema,
  translationKeysPageSchema,
  translationKeysQuerySchema,
  translationValueSchema,
} from './translations.schemas';

const access = { permissions: ['translations.manage'], tags: ['i18n'] } as const;

/** The admin translations editor: every bundled key, and one locale's override saved or removed. */
export const translationRoutes = {
  keys: defineRoute({
    method: 'GET',
    path: '/i18n/keys',
    query: translationKeysQuerySchema,
    response: translationKeysPageSchema,
    ...access,
  }),
  save: defineRoute({
    method: 'PUT',
    path: '/i18n/:locale/:key',
    params: translationKeyParamsSchema,
    body: translationValueSchema,
    response: 'empty',
    ...access,
  }),
  restore: defineRoute({
    method: 'DELETE',
    path: '/i18n/:locale/:key',
    params: translationKeyParamsSchema,
    response: 'empty',
    ...access,
  }),
};
