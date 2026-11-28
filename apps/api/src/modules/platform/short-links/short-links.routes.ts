import { defineRoute } from '@ab/core';
import { z } from 'zod';

/**
 * The printed short link a browser opens, never called by a client (docs/62 part 3 §1). Any text
 * is a code: one that cannot be ours gets the same 404 page (ShortLinks.resolve checks its shape).
 */
export const shortLinkRedirectRoutes = {
  go: defineRoute({
    method: 'GET',
    path: '/r/:code',
    params: z.object({ code: z.string() }),
    response: 'redirect',
    tags: ['short-links'],
    isPublic: true,
  }),
};
