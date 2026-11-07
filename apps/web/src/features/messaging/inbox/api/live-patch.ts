import { applyLiveRows, type LiveRow, patchChat, patchList } from '@ab/client-core';
import type { MessageStatus, ThreadView } from '@ab/shared';
import type { Query, QueryClient, QueryKey } from '@tanstack/react-query';
import { writeTicks } from './list-ticks';
import { threadQuery } from './thread-query';

// docs/44 K1 on the web: a realtime event's rows move the ticks of the chat and of every cached
// chats list at once, with no request: an instant visual patch only, never folded into a read.
// A chat read in flight started before the event is cancelled when the patch moved that chat (its
// data stays the patched one); the event's own re-read (live.ts) starts after it. A LIST read is
// never cancelled here: the throttled re-read (cancelRefetch: true) supersedes a stale one, so a
// burst of events can never starve the list (a stale tick shows for one throttle window at most).

/** A cached GET /threads page (the other fields ride along untouched). */
interface ListPage {
  items: ThreadView[];
}

type Incoming = ReadonlyMap<string, MessageStatus>;
type ChatData = Parameters<typeof patchChat>[0];

/** A cache to write: only when the patch moved a tick (a new object). */
const movedWrite = (key: QueryKey, before: object | undefined, next: object | undefined) =>
  next !== undefined && next !== before ? [{ key, next }] : [];

/**
 * A read the patch may cancel: one with data that is not a page load («تحميل الأقدم» would be
 * dropped) — a first load is never cancelled either: nothing would show.
 */
const held = (query: Query) =>
  query.state.data !== undefined && !query.state.fetchMeta?.fetchMore;

/** The chat cache with the event's ticks, as a write list (empty when nothing moved). */
function chatWrites(client: QueryClient, phone: string, incoming: Incoming) {
  const key = threadQuery(phone).queryKey;
  const chat = client.getQueryData<ChatData>(key);
  return movedWrite(key, chat, chat && patchChat(chat, incoming));
}

/**
 * Patches the chat of `phone` and every cached list with the event's rows (laterStatus: the
 * event's own ordering); their read times stay. Then cancels the chat read in flight only when
 * the chat moved (reverted to the patched data: TanStack keeps a manual write as the revert state).
 */
export function patchLiveCaches(client: QueryClient, phone: string, rows: readonly LiveRow[]) {
  const incoming: Incoming = applyLiveRows(rows);
  const chat = chatWrites(client, phone, incoming);
  const lists = client.getQueriesData<ListPage>({ queryKey: ['threads', 'list'] });
  [
    ...chat,
    ...lists.flatMap(([key, page]) => movedWrite(key, page, page && patchList(page, incoming))),
  ].forEach((w) => writeTicks(client, w.key, w.next));
  chat.forEach((w) => void client.cancelQueries({ queryKey: w.key, exact: true, predicate: held }));
}
