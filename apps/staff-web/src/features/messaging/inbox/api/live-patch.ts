import { applyLiveRows, type LiveRow, patchChat, patchList } from '@ab/client-core';
import type { MessageStatus, ThreadView } from '@ab/shared';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { writeTicks } from './list-ticks';
import { threadQuery } from './thread-query';

// docs/44 K1 on the web: a realtime event's rows move the ticks of the chat and of every cached
// chats list at once, with no request: an instant visual patch only, never folded into a read.
// No read is cancelled here (a burst of events would starve the chat and the list, rounds 4-5): the
// event's throttled re-read (live.ts, cancelRefetch: true) supersedes a stale read in flight, so a
// stale tick shows for one throttle window at most.

/** A cached GET /threads page (the other fields ride along untouched). */
interface ListPage {
  items: ThreadView[];
}

type Incoming = ReadonlyMap<string, MessageStatus>;
type ChatData = Parameters<typeof patchChat>[0];

/** A cache to write: only when the patch moved a tick (a new object). */
const movedWrite = (key: QueryKey, before: object | undefined, next: object | undefined) =>
  next !== undefined && next !== before ? [{ key, next }] : [];

/** The chat cache with the event's ticks, as a write list (empty when nothing moved). */
function chatWrites(client: QueryClient, phone: string, incoming: Incoming) {
  const key = threadQuery(phone).queryKey;
  const chat = client.getQueryData<ChatData>(key);
  return movedWrite(key, chat, chat && patchChat(chat, incoming));
}

/**
 * Patches the chat of `phone` and every cached list with the event's rows (laterStatus: the
 * event's own ordering); their read times stay.
 */
export function patchLiveCaches(client: QueryClient, phone: string, rows: readonly LiveRow[]) {
  const incoming: Incoming = applyLiveRows(rows);
  const chat = chatWrites(client, phone, incoming);
  const lists = client.getQueriesData<ListPage>({ queryKey: ['threads', 'list'] });
  [
    ...chat,
    ...lists.flatMap(([key, page]) => movedWrite(key, page, page && patchList(page, incoming))),
  ].forEach((w) => writeTicks(client, w.key, w.next));
}
