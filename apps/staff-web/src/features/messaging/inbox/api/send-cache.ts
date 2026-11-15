import {
  appendMessage,
  markUnconfirmed,
  refreshNewest,
  removeMessage,
  replaceMessage,
  touchedThread,
} from '@ab/client-core';
import type { MessageView, ThreadView } from '@ab/shared';
import type { QueryClient } from '@tanstack/react-query';
import type { Page } from '@/features/sales/leads';
import { threadPage, threadPath } from './api';
import { threadQuery } from './thread-query';

// What a send does to the cached chat and lists (docs/44 BUG3, as mobile does): the provisional row
// shows at once, the API's row takes its place (or a refusal takes it out), then ONE read of the
// open chat's newest page (docs/43 AU4) and the lists; never a reload of every ['threads'] query.

const listKey = ['threads', 'list'];
/** The lists and the nav badge (a send no longer re-reads every ['threads'] query). */
const refreshLists = (client: QueryClient): void => {
  for (const queryKey of [listKey, ['threads', 'nav-count']]) {
    void client.invalidateQueries({ queryKey });
  }
};

/** The chat's row in every cached list takes `row` as its last message, where it already is. */
function touchLists(client: QueryClient, row: MessageView): void {
  const touch = (th: ThreadView) =>
    th.phone_e164 === row.phone_e164 ? touchedThread(th, row) : th;
  client.setQueriesData<Page<ThreadView>>({ queryKey: listKey }, (old) =>
    old ? { ...old, items: old.items.map(touch) } : old,
  );
}

/** The open chat's newest page (one GET, merged), and the lists in the background. */
function refreshSentChat(client: QueryClient, row: MessageView, own: string[]): Promise<void> {
  refreshLists(client);
  const { queryKey } = threadQuery(row.phone_e164);
  return refreshNewest({
    own,
    busy: () => client.isFetching({ queryKey }) > 0,
    shown: () => client.getQueryCache().find({ queryKey, exact: true })?.isActive() === true,
    read: () => client.getQueryData(queryKey),
    write: (edit) => client.setQueryData(queryKey, edit),
    newest: () => threadPage(threadPath(row.phone_e164)),
    reload: () => client.invalidateQueries({ queryKey }),
  });
}

/** Before the API answers: the provisional row ends the chat; a full read in flight is dropped. */
export async function showSending(client: QueryClient, row: MessageView): Promise<void> {
  const { queryKey } = threadQuery(row.phone_e164);
  await client.cancelQueries({ queryKey });
  // A retry with a pinned id takes the place of its older «unconfirmed» bubble (docs/44 BUG7).
  client.setQueryData(queryKey, (old) => appendMessage(removeMessage(old, row.id), row));
  touchLists(client, row);
}

/** The API's row replaces the provisional one (`id`); the chat then reads its newest page. */
export function showSent(client: QueryClient, id: string, row: MessageView): void {
  client.setQueryData(threadQuery(row.phone_e164).queryKey, (old) => replaceMessage(old, id, row));
  touchLists(client, row);
  void refreshSentChat(client, row, [id, row.id]);
}

/** A refused send: its bubble goes (the text is back in the box), the lists read the truth. */
export function dropSending(client: QueryClient, phone: string, id: string): void {
  client.setQueryData(threadQuery(phone).queryKey, (old) => removeMessage(old, id));
  refreshLists(client);
}

/** No answer (deadline, network, 5xx): the bubble stays, «unconfirmed»; only the lists re-read. */
export function holdSending(client: QueryClient, phone: string, id: string): void {
  client.setQueryData(threadQuery(phone).queryKey, (old) => markUnconfirmed(old, id));
  refreshLists(client);
}
