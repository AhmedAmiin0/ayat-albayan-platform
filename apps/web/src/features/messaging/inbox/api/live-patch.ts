import { applyLiveRows, type LiveRow, patchChat, patchList } from '@ab/client-core';
import type { MessageStatus, ThreadView } from '@ab/shared';
import type { Query, QueryClient, QueryKey } from '@tanstack/react-query';
import { writeTicks } from './list-ticks';
import { inboxPatches } from './patch-times';
import { threadQuery } from './thread-query';

// docs/44 P1-2 / K1 on the web: a realtime event's rows move the ticks of the chat and of every
// cached chats list at once, with no request: an instant visual patch only. The event still
// re-reads through the live store's throttled refresh (live.ts); the reads stay the truth and
// fold by the patch-time rule (patch-times.ts).

/** A cached GET /threads page (the other fields ride along untouched). */
interface ListPage {
  items: ThreadView[];
}

type Incoming = ReadonlyMap<string, MessageStatus>;

/** A cache to write: only when the patch moved a tick (a new object). */
const movedWrite = (key: QueryKey, before: object | undefined, next: object | undefined) =>
  next !== undefined && next !== before ? [{ key, next }] : [];

/** The chat of `key` patched in place (laterStatus: the event's own ordering). */
function patchChatCache(client: QueryClient, key: QueryKey, incoming: Incoming): void {
  const chat = client.getQueryData<Parameters<typeof patchChat>[0]>(key);
  movedWrite(key, chat, chat && patchChat(chat, incoming)).forEach((w) =>
    writeTicks(client, w.key, w.next),
  );
}

/** The fetch in flight when it is an older (or newer) page being loaded; undefined otherwise. */
const pageLoad = (query: Query | undefined) =>
  query?.state.fetchMeta?.fetchMore ? query.promise : undefined;

/**
 * Patches the chat of `phone` and every cached list with the event's rows; their read times stay.
 * An older page loading now (fetchNextPage) started before this patch and commits the pages it
 * copied at its start: the patch goes on again once it lands (a refetch folds per page instead).
 */
export function patchLiveCaches(client: QueryClient, phone: string, rows: readonly LiveRow[]) {
  const incoming = applyLiveRows(rows);
  inboxPatches.mark(incoming.keys());
  const chatKey = threadQuery(phone).queryKey;
  patchChatCache(client, chatKey, incoming);
  const lists = client.getQueriesData<ListPage>({ queryKey: ['threads', 'list'] });
  lists
    .flatMap(([key, page]) => movedWrite(key, page, page && patchList(page, incoming)))
    .forEach((w) => writeTicks(client, w.key, w.next));
  const loading = pageLoad(client.getQueryCache().find({ queryKey: chatKey, exact: true }));
  void loading?.then(
    () => patchChatCache(client, chatKey, incoming),
    () => undefined,
  );
}
