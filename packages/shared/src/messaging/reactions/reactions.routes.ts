import { defineRoute, id, phoneE164 } from '@ab/core';
import { z } from 'zod';
import { threadReactionSchema } from './reactions';
import { reactionResultSchema } from './reactions.schemas';

/** A reaction is a staff send from the thread: the scopes and audit of a text send. */
export const messageReactionRoutes = {
  /**
   * 200 even when WhatsApp refused it (the status says so); 404 message_not_found outside the
   * chat, 409 not_reactable without a wamid, 409 reaction_too_old past 30 days.
   */
  react: defineRoute({
    method: 'PUT',
    path: '/threads/:phone/messages/:id/reaction',
    params: z.object({ phone: phoneE164, id: id() }),
    body: threadReactionSchema,
    response: reactionResultSchema,
    permissions: ['inbox.send'],
    tags: ['inbox'],
  }),
};
