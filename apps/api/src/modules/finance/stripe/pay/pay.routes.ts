import { defineRoute } from '@ab/core';
import { publicPaymentLinkSchema } from '@ab/shared';
import { z } from 'zod';

const byToken = z.object({ token: z.string() });
const page = { method: 'GET', params: byToken, tags: ['stripe'], isPublic: true } as const;

/** The pages a payer's browser opens (docs/30); no client calls them, so they stay in the api. */
export const payPageRoutes = {
  /** The link as JSON for an `Accept: application/json` caller, else the pay page's HTML. */
  page: defineRoute({
    ...page,
    path: '/pay/:token',
    response: z.union([publicPaymentLinkSchema, z.string()]),
  }),
  checkout: defineRoute({ ...page, path: '/pay/:token/checkout', response: 'redirect' }),
  done: defineRoute({ ...page, path: '/pay/:token/done', response: 'file' }),
  cancelled: defineRoute({ ...page, path: '/pay/:token/cancelled', response: 'file' }),
};
