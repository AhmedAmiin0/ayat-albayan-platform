import { defineRoute } from '@ab/core';
import { z } from 'zod';

/** A value Google did not send as one string reads as none, so the browser still goes back. */
const sent = z.string().optional().catch(undefined);

/** Google's redirect back to the platform, never called by a client (docs/62 part 3 §1). */
export const googleOAuthRoutes = {
  callback: defineRoute({
    method: 'GET',
    path: '/integrations/google/callback',
    query: z.object({ code: sent, state: sent, error: sent }),
    response: 'redirect',
  }),
};
