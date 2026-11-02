import { asciiDigits, normalizeArabic } from '@ab/core';
import { z } from 'zod';

// «بحث» inside one chat (owner 2026-11-02): GET /threads/:phone/search, newest hit first.

/** Hits a page carries; the bar steps past them by loading the next page (`next_cursor`). */
export const CHAT_SEARCH_PAGE = 50;
/** Characters a snippet keeps on each side of the match. */
export const SNIPPET_SIDE = 40;

/** Text as the search sees it: tashkeel gone, أإآ/ة/ى folded, Latin lowercased, digits Western. */
export function searchFold(text: string): string {
  return asciiDigits(normalizeArabic(text));
}

/** A page's end: the last hit's time and id (keyset; the hits are newest first). */
const cursorSchema = z
  .string()
  .max(80)
  .refine((c) => {
    const cut = c.lastIndexOf('_');
    const at = z.iso.datetime({ offset: true }).safeParse(c.slice(0, cut));
    return cut > 0 && at.success && z.uuid().safeParse(c.slice(cut + 1)).success;
  });

export const chatSearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
  cursor: cursorSchema.optional(),
});
export type ChatSearchQuery = z.infer<typeof chatSearchQuerySchema>;

export const chatSearchHitSchema = z.object({
  id: z.uuid(),
  created_at: z.string(),
  snippet: z.string(),
});
export type ChatSearchHit = z.infer<typeof chatSearchHitSchema>;

export const chatSearchPageSchema = z.object({
  items: z.array(chatSearchHitSchema),
  /** Every hit in the chat (the bar's «من M»). */
  total: z.number().int().min(0),
  next_cursor: z.string().nullable(),
});
export type ChatSearchPage = z.infer<typeof chatSearchPageSchema>;

/** The cursor after a hit (CURSOR_RE). */
export const searchCursor = (hit: Pick<ChatSearchHit, 'id' | 'created_at'>): string =>
  `${hit.created_at}_${hit.id}`;

/** The cursor's time and id; null for a malformed one (the schema already refused it). */
export function parseSearchCursor(cursor: string): { at: number; id: string } | null {
  const cut = cursor.lastIndexOf('_');
  const at = Date.parse(cursor.slice(0, cut));
  return cut < 0 || Number.isNaN(at) ? null : { at, id: cursor.slice(cut + 1) };
}

/** Does any of the message's texts (body / caption, document name) contain the folded query? */
export function messageMatches(texts: readonly (string | null)[], query: string): boolean {
  const q = searchFold(query);
  return q !== '' && texts.some((t) => t !== null && searchFold(t).includes(q));
}
