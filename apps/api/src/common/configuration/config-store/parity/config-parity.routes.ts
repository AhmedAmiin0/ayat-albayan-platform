import { defineRoute } from '@ab/core';
import { configParityResponseSchema } from './config-parity.schemas';

/** Read by staging checks and the e2e suite, never by a client app (docs/62 part 3 §1). */
export const configParityRoutes = {
  parity: defineRoute({
    method: 'GET',
    path: '/admin/config/parity',
    response: configParityResponseSchema,
    permissions: ['settings.read'],
    tags: ['config'],
  }),
};
