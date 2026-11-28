import { defineRoute } from '@ab/core';
import { authMeSchema } from './auth-me.schemas';

/** Any signed-in login, whatever its role: the clients learn their permissions here. */
export const authMeRoutes = {
  me: defineRoute({
    method: 'GET',
    path: '/auth/me',
    response: authMeSchema,
    tags: ['auth'],
  }),
};
