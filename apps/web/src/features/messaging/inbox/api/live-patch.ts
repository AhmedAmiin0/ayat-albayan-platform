import { applyLiveRows, type LiveRow, patchChat, patchList } from '@ab/client-core';
import type { MessageStatus, ThreadView } from '@ab/shared';
import type { Query, QueryClient, QueryKey } from '@tanstack/react-query';
import { writeTicks } from './list-ticks';
import { threadQuery } from './thread-query';

// docs/44 K1 on the web: a realtime event's rows move the ticks of the chat and of every cached
// chats list at once, with no request: an instant visual patch only, never folded into a read.
// A read in flight started before the event: it is cancelled here (its data stays the patched
// one), so it never lands after the patch; the event's own re-read (live.ts, cancelRefetch: true,
// throttled) starts after it and is written as the server sent it.

/** A cached GET /threads page (the other fields ride along untouched). */
interface ListPage {
  items: ThreadView[];
}

type Incoming = ReadonlyMap<string, MessageStatus>;

/** A cache to write: only when the patch moved a tick (a new object). */
const movedWrite = (key: QueryKey, before: object | undefined, next: object | undefined) =>
  next !== undefined && next !== before ? [{ key, next }] : [];

/** A query with data (a first load is never cancelled: nothing would show). */
const held = (query: Query) => query.state.data !== undefined;

/**
 * Patches the chat of `phone` and every cached list with the event's rows (laterStatus: the
 * event's own ordering); their read times stay. Then cancels their reads in flight (reverted to
 * the patched data: TanStack keeps a manual write as the revert state).
 */
export function patchLiveCaches(client: QueryClient, phone: string, rows: readonly LiveRow[]) {
  const incoming: Incoming = applyLiveRows(rows);
  const chatKey = threadQuery(phone).queryKey;
  const chat = client.getQueryData<Parameters<typeof patchChat>[0]>(chatKey);
  const lists = client.getQueriesData<ListPage>({ queryKey: ['threads', 'list'] });
  [
    ...movedWrite(chatKey, chat, chat && patchChat(chat, incoming)),
    ...lists.flatMap(([key, page]) => movedWrite(key, page, page && patchList(page, incoming))),
  ].forEach((w) => writeTicks(client, w.key, w.next));
  const cancel = (queryKey: QueryKey, exact: boolean) =>
    void client.cancelQueries({ queryKey, exact, predicate: held });
  cancel(chatKey, true);
  cancel(['threads', 'list'], false);
}
