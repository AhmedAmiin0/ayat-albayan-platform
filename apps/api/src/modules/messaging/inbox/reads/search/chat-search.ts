import {
  messageMatches,
  parseSearchCursor,
  searchCursor,
  searchSnippet,
  type ChatSearchHit,
  type ChatSearchPage,
} from '@ab/shared';
import type { SearchRow } from './chat-search.repo';

interface SearchInput {
  q: string;
  cursor?: string | undefined;
  limit: number;
}

interface Key {
  at: number;
  id: string;
}

const keyOf = (r: SearchRow): Key => ({ at: Date.parse(r.created_at), id: r.id });

/** Newest first, the id breaking a tie (the page order and the cursor's keyset). */
const newerFirst = (a: Key, b: Key): number => b.at - a.at || b.id.localeCompare(a.id);

const texts = (r: SearchRow): (string | null)[] => [r.body, r.media_name];

/** The first of the row's texts that matches: its snippet. */
function hitOf(r: SearchRow, q: string): ChatSearchHit {
  const text = texts(r).find((t) => t !== null && messageMatches([t], q)) ?? '';
  return { id: r.id, created_at: r.created_at, snippet: searchSnippet(text, q) };
}

/** Only the hits past the cursor (older, in the page order); all of them without one. */
function pastCursor(hits: readonly SearchRow[], cursor: string | undefined): SearchRow[] {
  const end = cursor ? parseSearchCursor(cursor) : null;
  return end ? hits.filter((r) => newerFirst(end, keyOf(r)) < 0) : [...hits];
}

/**
 * One page of a chat's hits (owner 2026-11-02), newest first: every row's body / caption and
 * document name matched folded (searchFold: tashkeel, letter forms, case, digits), the total over
 * the whole chat, and the cursor after the page's last hit while older ones remain.
 */
export function searchPage(rows: readonly SearchRow[], input: SearchInput): ChatSearchPage {
  const unique = [...new Map(rows.map((r) => [r.id, r])).values()];
  const hits = unique
    .filter((r) => messageMatches(texts(r), input.q))
    .sort((a, b) => newerFirst(keyOf(a), keyOf(b)));
  const rest = pastCursor(hits, input.cursor);
  const page = rest.slice(0, input.limit);
  const last = page.at(-1);
  const more = rest.length > input.limit && last !== undefined;
  return {
    items: page.map((r) => hitOf(r, input.q)),
    total: hits.length,
    next_cursor: more ? searchCursor(last) : null,
  };
}
