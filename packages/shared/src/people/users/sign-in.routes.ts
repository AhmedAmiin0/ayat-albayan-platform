import { defineRoute } from '@ab/core';
import {
  codeRequestSchema,
  codeSessionSchema,
  codeStatusSchema,
  codeVerifySchema,
  forgotSchema,
  loginSchema,
  passwordSessionSchema,
  resetSchema,
} from './sign-in';

const access = { tags: ['auth'] } as const;

/**
 * The public sign-in routes (docs/30 §6): the family's and the teacher's WhatsApp codes (docs/46
 * A2) and the password sign-in and reset. A code request and a forgot answer 202 whatever exists.
 */
export const signInRoutes = {
  status: defineRoute({
    ...access,
    method: 'GET',
    path: '/auth/code/status',
    response: codeStatusSchema,
  }),
  staffRequest: defineRoute({
    ...access,
    method: 'POST',
    path: '/auth/staff-code/request',
    body: codeRequestSchema,
    response: 'empty',
  }),
  staffVerify: defineRoute({
    ...access,
    method: 'POST',
    path: '/auth/staff-code/verify',
    body: codeVerifySchema,
    response: codeSessionSchema,
  }),
  request: defineRoute({
    ...access,
    method: 'POST',
    path: '/auth/code/request',
    body: codeRequestSchema,
    response: 'empty',
  }),
  verify: defineRoute({
    ...access,
    method: 'POST',
    path: '/auth/code/verify',
    body: codeVerifySchema,
    response: codeSessionSchema,
  }),
  login: defineRoute({
    ...access,
    method: 'POST',
    path: '/auth/login',
    body: loginSchema,
    response: passwordSessionSchema,
  }),
  forgot: defineRoute({
    ...access,
    method: 'POST',
    path: '/auth/password/forgot',
    body: forgotSchema,
    response: 'empty',
  }),
  reset: defineRoute({
    ...access,
    method: 'POST',
    path: '/auth/password/reset',
    body: resetSchema,
    response: 'empty',
  }),
};
