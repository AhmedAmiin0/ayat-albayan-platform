import { defineRoute } from '@ab/core';

/**
 * LiveKit's callback, which no client calls (docs/62 part 3 §1). The signed body is read raw and
 * checked by the service before it is parsed, so the route declares no body.
 */
export const livekitWebhookRoutes = {
  receive: defineRoute({
    method: 'POST',
    path: '/livekit/webhook',
    response: 'empty',
    isPublic: true,
    tags: ['classroom'],
  }),
};
