import { defineRoute } from '@ab/core';
import { z } from 'zod';
import { pushTokenAnswerSchema, pushTokenBodySchema, pushTokenSchema } from './push-tokens.schemas';

/** The caller's own device registration (R-MOB-01), written once for the api and its clients. */
export const pushTokenRoutes = {
  /** Idempotent; answers the device key to send next time, 409 for another person's device. */
  add: defineRoute({
    method: 'PUT',
    path: '/me/push-tokens',
    body: pushTokenBodySchema,
    response: pushTokenAnswerSchema,
  }),
  /** 204 even when the token was not stored. */
  remove: defineRoute({
    method: 'DELETE',
    path: '/me/push-tokens/:token',
    params: z.object({ token: pushTokenSchema }),
    response: 'empty',
  }),
};
