import { defineRoute } from '@ab/core';
import { forwardResponseSchema, threadForwardSchema } from './thread-forward.schemas';

/** Copies one message to other chats through the send path. */
export const threadForwardRoutes = {
  /** 201; staff who send in the inbox; each target answered on its own. */
  forward: defineRoute({
    method: 'POST',
    path: '/threads/forward',
    body: threadForwardSchema,
    response: forwardResponseSchema,
  }),
};
