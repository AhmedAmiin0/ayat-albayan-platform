import { defineRoute } from '@ab/core';
import { z } from 'zod';

const ACCESS = { tags: ['webhooks'], isPublic: true } as const;

const meAnswerSchema = z.object({
  data: z.object({
    account: z.object({ name: z.string() }),
    key: z.object({ scopes: z.array(z.string()) }),
  }),
});

const sentAnswerSchema = z.object({
  data: z.object({ message_id: z.string(), whatsapp_message_id: z.string().nullable() }),
});

/**
 * The old Apps Script's CRM-shaped calls (docs/19 «script relay»), which no client of ours makes
 * (docs/62 part 3 §1). No route declares a body: the controller checks the line's key first and
 * words a bad body the way the CRM does.
 */
export const relayRoutes = {
  me: defineRoute({
    method: 'GET',
    path: '/script-relay/api/v1/me',
    response: meAnswerSchema,
    ...ACCESS,
  }),
  send: defineRoute({
    method: 'POST',
    path: '/script-relay/api/v1/messages',
    response: sentAnswerSchema,
    ...ACCESS,
  }),
};
