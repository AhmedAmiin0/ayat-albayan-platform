import { defineRoute } from '@ab/core';
import { z } from 'zod';

const open = { isPublic: true, tags: ['lesson-links'] } as const;

/**
 * Public links opened in a browser, which no client calls (docs/62 part 3 §1): each answers a 302
 * or the short «invalid link» text.
 */
export const lessonLinkRoutes = {
  /** Any text: a token that is not ours is the same «invalid link» page. */
  join: defineRoute({
    method: 'GET',
    path: '/join/:token',
    params: z.object({ token: z.string().max(100) }),
    response: 'redirect',
    ...open,
  }),
  /** The old report redirector forwards every /r/<path> here; the handler reads the raw path. */
  legacyReport: defineRoute({
    method: 'GET',
    path: '/report-link/legacy/*',
    response: 'redirect',
    ...open,
  }),
};
