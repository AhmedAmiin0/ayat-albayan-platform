import { phoneE164 } from '@ab/core';
import { z } from 'zod';
import { chatSearchHitSchema, cursorSchema, searchFold } from './chat-search';

// Search across all readable chats (docs/37), newest first; no total, only a cursor.

/** Hits a page carries (the RPC reads one more to know whether older ones remain). */
export const MESSAGE_SEARCH_PAGE = 30;
/** Folded characters the words need before the search runs (the trigram index needs 3). */
export const MESSAGE_SEARCH_MIN = 3;

/** Is the typed text long enough for the global search (tashkeel and spaces do not count)? */
export const searchesMessages = (q: string): boolean =>
  searchFold(q).length >= MESSAGE_SEARCH_MIN;

export const messageSearchQuerySchema = z.object({
  q: z.string().trim().max(100).refine(searchesMessages, { message: 'too_short' }),
  cursor: cursorSchema.optional(),
});
export type MessageSearchQuery = z.infer<typeof messageSearchQuerySchema>;

export const messageSearchHitSchema = chatSearchHitSchema.extend({
  phone_e164: phoneE164,
  display_name: z.string().nullable(),
});
export type MessageSearchHit = z.infer<typeof messageSearchHitSchema>;

export const messageSearchPageSchema = z.object({
  items: z.array(messageSearchHitSchema),
  next_cursor: z.string().nullable(),
});
export type MessageSearchPage = z.infer<typeof messageSearchPageSchema>;
