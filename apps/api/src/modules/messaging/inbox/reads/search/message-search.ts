import { messageMatches, searchCursor, type MessageSearchPage } from '@ab/shared';
import { hitOf, texts } from './chat-search';
import type { MessageSearchRow } from './message-search.repo';

interface PageInput {
  q: string;
  limit: number;
}

/**
 * One page of the global search (docs/37), newest first. Every row is matched again with the
 * in-chat matcher (an old-CRM link body, any SQL/TS fold drift): a global hit is never something
 * the chat's own search would not find. The cursor comes from the last RAW row, so a page the
 * re-check shortened still continues; only a null cursor ends the search.
 */
export function messageSearchPage(
  rows: readonly MessageSearchRow[],
  input: PageInput,
): MessageSearchPage {
  const page = rows.slice(0, input.limit);
  const last = page.at(-1);
  const more = rows.length > input.limit && last !== undefined;
  const items = page
    .filter((r) => messageMatches(texts(r), input.q))
    .map((r) => ({ ...hitOf(r, input.q), phone_e164: r.phone_e164, display_name: r.display_name }));
  return { items, next_cursor: more ? searchCursor(last) : null };
}
