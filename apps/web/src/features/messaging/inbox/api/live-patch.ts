import { applyLiveRows, chatStatus, type LiveRow, patchChat, patchList } from '@ab/client-core';
import type { ThreadView } from '@ab/shared';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { writeTicks } from './list-ticks';
import { threadQuery } from './thread-query';

// docs/44 P1-2 / K1 on the web: a realtime event's rows move the ticks of the open chat and of
// every cached chats list at once, with no request. Only the WATCHED chat says whether that was all
// (a list cache never does): a row it does not show, an inbound or a queued row still re-reads
// through the live store's throttled refresh, as a {phone}-only event does.

/** A cached GET /threads page (the other fields ride along untouched). */
interface ListPage {
  items: ThreadView[];
}

/** A cache to write: only when the patch moved a tick (a new object). */
const movedWrite = (key: QueryKey, before: object | undefined, next: object | undefined) =>
  next !== undefined && next !== before ? [{ key, next }] : [];

/**
 * Patches the chat of `phone` and every cached list with the event's rows (laterStatus: a tick
 * never goes back); their read times stay. True only when the event moved ticks of outbound rows
 * the chat on screen (`watched`) already shows: nothing left to re-read.
 */
export function patchLiveCaches(
  client: QueryClient,
  { phone, watched }: { phone: string; watched: boolean },
  rows: readonly LiveRow[],
): boolean {
  const chatKey = threadQuery(phone).queryKey;
  const chat = client.getQueryData(chatKey);
  const lists = client.getQueriesData<ListPage>({ queryKey: ['threads', 'list'] });
  const statusOf = (id: string) => (watched ? chatStatus(chat, id) : undefined);
  const { incoming, complete } = applyLiveRows(rows, statusOf);
  const writes = [
    ...movedWrite(chatKey, chat, chat && patchChat(chat, incoming)),
    ...lists.flatMap(([key, page]) => movedWrite(key, page, page && patchList(page, incoming))),
  ];
  writes.forEach((w) => writeTicks(client, w.key, w.next));
  return complete;
}
