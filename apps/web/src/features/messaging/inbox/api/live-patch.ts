import { applyLiveRows, chatStatus, type LiveRow, patchChat, patchList } from '@ab/client-core';
import type { MessageStatus, ThreadView } from '@ab/shared';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { writeTicks } from './list-ticks';
import { threadQuery } from './thread-query';

// docs/44 P1-2 / K1 on the web: a realtime event's rows move the ticks of the open chat and of
// every cached chats list at once, with no request. An id neither holds (a new message) still
// re-reads through the live store's throttled refresh, as a {phone}-only event does.

/** A cached GET /threads page (the other fields ride along untouched). */
interface ListPage {
  items: ThreadView[];
}

/** The last message's tick of each cached list row of `phone`, by message id. */
function listStatuses(lists: [unknown, ListPage | undefined][], phone: string) {
  const items = lists.flatMap(([, page]) => page?.items ?? []);
  const rows = items.filter((t) => t.phone_e164 === phone);
  return new Map<string, MessageStatus>(rows.map((t) => [t.last_message_id, t.last_status]));
}

/** A cache to write: only when the patch moved a tick (a new object). */
const movedWrite = (key: QueryKey, before: object | undefined, next: object | undefined) =>
  next !== undefined && next !== before ? [{ key, next }] : [];

/**
 * Patches the chat of `phone` and every cached list with the event's rows (laterStatus: a tick
 * never goes back); their read times stay. True when every row was held: nothing left to re-read.
 */
export function patchLiveCaches(
  client: QueryClient,
  phone: string,
  rows: readonly LiveRow[],
): boolean {
  const chatKey = threadQuery(phone).queryKey;
  const chat = client.getQueryData(chatKey);
  const lists = client.getQueriesData<ListPage>({ queryKey: ['threads', 'list'] });
  const listed = listStatuses(lists, phone);
  const statusOf = (id: string) => chatStatus(chat, id) ?? listed.get(id);
  const { incoming, complete } = applyLiveRows(rows, statusOf);
  const writes = [
    ...movedWrite(chatKey, chat, chat && patchChat(chat, incoming)),
    ...lists.flatMap(([key, page]) => movedWrite(key, page, page && patchList(page, incoming))),
  ];
  writes.forEach((w) => writeTicks(client, w.key, w.next));
  return complete;
}
