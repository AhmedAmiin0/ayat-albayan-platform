import { defineRoute } from '@ab/core';
import { commsSourceSchema } from '../schemas';
import { commsSourceViewSchema, parityViewSchema } from './parity.schemas';

/** Legacy vs module parity and the read switch (docs/23 §2e steps 4–5). */
export const communicationsRoutes = {
  /** Ids and «same / different / missing» only, never a secret value. */
  parity: defineRoute({
    method: 'GET',
    path: '/admin/communications/parity',
    response: parityViewSchema,
    permissions: ['settings.read'],
    tags: ['numbers'],
  }),
  /** 200; to module refused with 409 parity_not_empty while parity is non-empty. */
  source: defineRoute({
    method: 'POST',
    path: '/admin/communications/source',
    body: commsSourceSchema,
    response: commsSourceViewSchema,
    permissions: ['numbers.manage'],
    tags: ['numbers'],
  }),
};
