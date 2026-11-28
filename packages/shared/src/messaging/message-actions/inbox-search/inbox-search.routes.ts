import { defineRoute, phoneE164 } from '@ab/core';
import { z } from 'zod';
import { chatSearchPageSchema, chatSearchQuerySchema } from '../chat-search';
import { messageSearchPageSchema, messageSearchQuerySchema } from '../message-search';

const access = { permissions: ['inbox.read'], tags: ['inbox'] } as const;

/** Message search in the inbox, newest hit first; each caller sees only the chats it may read. */
export const inboxSearchRoutes = {
  /** 200; across every readable chat, no total; 400 when the words are under three letters. */
  messages: defineRoute({
    method: 'GET',
    path: '/threads/search',
    query: messageSearchQuerySchema,
    response: messageSearchPageSchema,
    ...access,
  }),
  /** 200; inside one chat, with the total; 400 invalid_phone. */
  chat: defineRoute({
    method: 'GET',
    path: '/threads/:phone/search',
    params: z.object({ phone: phoneE164 }),
    query: chatSearchQuerySchema,
    response: chatSearchPageSchema,
    ...access,
  }),
};
