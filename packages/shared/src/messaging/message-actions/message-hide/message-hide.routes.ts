import { defineRoute } from '@ab/core';
import { messageHideParamsSchema } from './message-hide.schemas';

/** Hides a WhatsApp message from the platform only; it stays on the customer's phone. */
export const messageHideRoutes = {
  /** 204; staff who reply in the inbox; 404 message_not_found for another chat's message. */
  hide: defineRoute({
    method: 'POST',
    path: '/threads/:phone/messages/:messageId/hide',
    params: messageHideParamsSchema,
    response: 'empty',
  }),
  /** 204; the admin only. */
  unhide: defineRoute({
    method: 'DELETE',
    path: '/threads/:phone/messages/:messageId/hide',
    params: messageHideParamsSchema,
    response: 'empty',
  }),
};
