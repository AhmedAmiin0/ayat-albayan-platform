import { defineRoute } from '@ab/core';
import { receivablesViewSchema } from '@ab/money';

const access = { permissions: ['receivables.read'], tags: ['receivables'] } as const;

/** Who owes, how much and for how long, written once for the api and its clients. */
export const receivablesRoutes = {
  list: defineRoute({ method: 'GET', path: '/receivables', response: receivablesViewSchema, ...access }),
};
