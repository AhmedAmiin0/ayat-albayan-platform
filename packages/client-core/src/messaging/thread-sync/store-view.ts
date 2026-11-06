import type { MessageView, SyncMessage } from '@ab/shared';
import { laterTicks, ranksAbove, type StatusOf, type TickRow } from '../ticks/index.js';

// The chat and the chats list read the phone store (docs/43 43-7): its rows are the one source
// of a message's tick, and of a row the HTTP pages have not brought yet.

const time = (m: MessageView) => Date.parse(m.created_at);

/** A chat's pages (TanStack's InfiniteData of thread pages): pages[0] is the newest. */
interface Pages<P extends { messages: MessageView[] }> {
  pages: P[];
}

/**
 * Every page with the stored tick of the same id when it is further along (laterTicks: the 43-1
 * rank). The same object when no tick moves, so an unchanged store never re-renders the chat.
 */
export function withStoredTicks<P extends { messages: MessageView[] }, T extends Pages<P>>(
  data: T,
  stored: readonly SyncMessage[],
): T {
  const cache = { pages: [{ messages: stored }] };
  const pages = data.pages.map((p) => laterTicks(cache, p));
  return pages.every((p, i) => p === data.pages[i]) ? data : { ...data, pages };
}

/** Stored rows newer than every row of the newest page, that no page holds (a sync was first). */
function arrivals(pages: readonly { messages: MessageView[] }[], stored: readonly SyncMessage[]) {
  const known = new Set(pages.flatMap((p) => p.messages.map((m) => m.id)));
  const newest = Math.max(Number.NEGATIVE_INFINITY, ...(pages[0]?.messages ?? []).map(time));
  return stored.filter((m) => !known.has(m.id) && time(m) > newest);
}

/**
 * The live chat over the store: stored ticks (withStoredTicks), and stored rows newer than the
 * newest page joined to it in time order. An anchored window takes only the ticks.
 */
export function withStoredRows<P extends { messages: MessageView[] }, T extends Pages<P>>(
  data: T,
  stored: readonly SyncMessage[],
): T {
  const ticked = withStoredTicks<P, T>(data, stored);
  const [head, ...older] = ticked.pages;
  const added = arrivals(ticked.pages, stored);
  if (!head || added.length === 0) return ticked;
  const messages = [...head.messages, ...added].sort((a, b) => time(a) - time(b));
  return { ...ticked, pages: [{ ...head, messages }, ...older] };
}

/** A chats-list row's tick from the stored chats-list rows: only for the same last message. */
export const storedStatus =
  (threads: ReadonlyMap<string, TickRow>): StatusOf =>
  (row) => {
    const held = threads.get(row.phone_e164);
    return held?.last_message_id === row.last_message_id ? held.last_status : undefined;
  };

/** Two tick sources as one: the further along of the two (never lower than either). */
export const furtherOf =
  (a: StatusOf, b: StatusOf): StatusOf =>
  (row) => {
    const x = a(row);
    const y = b(row);
    return y !== undefined && (x === undefined || ranksAbove(y, x)) ? y : x;
  };
