import { defineRoute } from '@ab/core';
import { accountSetupSchema } from './account-setup';

/** A code-made teacher login's own email and password, set once (docs/46 A4). */
export const accountSetupRoutes = {
  setup: defineRoute({
    method: 'PUT',
    path: '/me/setup',
    body: accountSetupSchema,
    response: 'empty',
  }),
};
