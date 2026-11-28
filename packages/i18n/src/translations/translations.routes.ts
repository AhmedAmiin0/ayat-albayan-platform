import { defineRoute } from '@ab/core';
import {
  translationKeyParamsSchema,
  translationKeysPageSchema,
  translationKeysQuerySchema,
  translationLocaleParamsSchema,
  translationOverridesSchema,
  translationValueSchema,
} from './translations.schemas';

const access = { permissions: ['translations.manage'], tags: ['i18n'] } as const;

/**
 * The admin translations editor (every bundled key, one locale's override saved or removed) and
 * the public overrides map the apps read at boot, before sign-in.
 */
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
  overrides: defineRoute({
    method: 'GET',
    path: '/i18n/:locale/overrides',
    params: translationLocaleParamsSchema,
    response: translationOverridesSchema,
    tags: ['i18n'],
    isPublic: true,
  }),
};
