import type { MessageView, ThreadDetail } from '@ab/shared';
import { refreshNewest, threadNextParam, threadPageQuery, type ThreadPageParam } from '@ab/client-core';
import {
  infiniteQueryOptions,
  type QueryClient,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/core/lib/http/api';
import { markOwnSend } from '@/inbox/thread/anchor/own-send';
import { useStoredView } from '@/inbox/thread/local/stored-view';
import { rollback, unanswered } from '@/inbox/thread/send/after-send';
import { failPinned, pinGeneration, pinnedOf, settlePinned } from '@/inbox/thread/send/pinned-outcome';
import { carried, type SendDone, sendBody, type SendInput } from '@/inbox/thread/send/outgoing';
import { refreshInbox, refreshLists, touchInbox } from './inbox-sync';
import {
  appendMessage,
  provisionalMessage,
  removeMessage,
  replaceMessage,
  sendKey,
  threadKey,
  threadPath,
  type ThreadCache,
} from './thread-cache';
import { useThreadPoll } from './thread-poll';

/** One page of a chat (the live pages and the window around a search hit, docs/37). */
export const threadGet = (path: string, init?: { signal?: AbortSignal }) =>
  apiFetch<ThreadDetail>(path, init);

/** The chat's infinite query: useThread, and «محادثة جديدة» reading a number before it opens it. */
export const threadQuery = (phone: string) =>
  infiniteQueryOptions({
    queryKey: threadKey(phone),
    // TanStack's signal: closing the chat drops its read, so a later push tap never joins it.
    // Older builds persisted a bare `before` string: threadPageQuery still pages back from it.
    queryFn: ({ pageParam, signal }) =>
      threadGet(`${threadPath(phone)}${threadPageQuery(pageParam)}`, { signal }),
    initialPageParam: null as ThreadPageParam,
    getNextPageParam: threadNextParam,
    meta: { noPersist: true },
  });

/**
 * GET /threads/:phone (docs/12 H2): newest page first, `before` + `before_id` page back (docs/37);
 * the API stamps inbound rows read. Pages stay off disk: the phone store opens a chat offline and
 * keeps its ticks (docs/43 43-7, useStoredView). On screen useThreadPoll keeps it live.
 */
export function useThread(phone: string) {
  const query = useInfiniteQuery(threadQuery(phone));
  useThreadPoll(phone, query.data !== undefined);
  return useStoredView(phone, query);
}

/**
 * After a send (docs/43 AU4): every list that shows the chat, and ONE read of the chat's newest
 * page folded in (mergeNewest), however far up she scrolled; older pages are not re-read one by
 * one. A chat query without an active observer is only marked stale (a GET stamps it read); a
 * read in flight is replaced by a full one. `own`: this send's ids (provisional and the API's).
 */
export function refreshSent(client: QueryClient, phone: string, own: string[] = []) {
  refreshLists(client);
  const queryKey = threadKey(phone);
  return refreshNewest<ThreadCache>({
    own,
    shown: () => client.getQueryCache().find({ queryKey, exact: true })?.isActive() === true,
    busy: () => client.isFetching({ queryKey }) > 0,
    read: () => client.getQueryData<ThreadCache>(queryKey),
    write: (edit) => client.setQueryData<ThreadCache>(queryKey, edit),
    newest: () => threadGet(threadPath(phone)),
    reload: () => client.invalidateQueries({ queryKey }),
  });
}

/** An answer refreshes the newest page (refreshSent); no answer only the lists: a full read now
 *  would drop the «unconfirmed» bubble (docs/44 BUG7), the polls' merges keep it. */
function afterSend(client: QueryClient, phone: string, done: SendDone): Promise<void> {
  if (!unanswered(done.error)) return refreshSent(client, phone, [done.id, done.row?.id ?? done.id]);
  refreshLists(client);
  return Promise.resolve();
}

export type { Outgoing } from '@/inbox/thread/send/outgoing'; // what the composer sends

/**
 * Optimistic send: the row shows at once as queued; the API's row replaces it, or a refusal takes
 * it out again (the caller shows `sendError`); either answer refetches the newest page. No answer
 * keeps it «unconfirmed» and pins its id for its sender until an answer (docs/44 BUG7,
 * send/pinned-outcome: hook-level, so it settles after the screen closed too).
 */
export { sendKey } from './thread-cache';

export function useSendMessage(phone: string) {
  const client = useQueryClient();
  const queryKey = threadKey(phone);
  const edit = (fn: (old: ThreadCache | undefined) => ThreadCache | undefined) =>
    client.setQueryData<ThreadCache>(queryKey, fn);
  const pinned = (input: SendInput, generation = -1) => pinnedOf(phone, input, generation);
  return useMutation({
    // One key per chat: the composer and «عرض سعر» see each other's send in flight (useIsMutating).
    mutationKey: sendKey(phone),
    mutationFn: (input: SendInput) =>
      apiSend<MessageView>('POST', `${threadPath(phone)}/${input.out.kind}`, sendBody(input)),
    onMutate: async ({ out, id, pin }) => {
      const generation = pinGeneration(pin);
      markOwnSend(phone);
      await client.cancelQueries({ queryKey });
      const text = carried(out);
      const key = out.kind === 'template' ? out.key : undefined;
      // An answer shows its quote at once (owner 2026-10-25 «رد»), as the API's row will.
      const quote = out.kind === 'text' && out.replyTo ? { reply_to_message_id: out.replyTo.id, reply_to: out.replyTo } : {};
      const row = { ...provisionalMessage({ id, phone, body: text, templateKey: key }), ...quote };
      edit((old) => appendMessage(removeMessage(old, id), row));
      await touchInbox(client, row);
      return { generation };
    },
    // The server row replaces the provisional one (a retry's provisional replaced the older one).
    onSuccess: (row, input, context) => {
      edit((old) => replaceMessage(old, input.id, row));
      settlePinned(pinned(input, context.generation), row);
    },
    onError: (error, input, context) => {
      edit(rollback(error, input.id));
      failPinned(pinned(input, context?.generation), error);
    },
    onSettled: (row, error, { id }) => afterSend(client, phone, { row, error, id }),
  });
}

/** app-send: «أرسل عبر واتساب», the row's short pending window (docs/19). */
type MessageAction = 'retry' | 'sent-manually' | 'hand-off' | 'app-send';

/**
 * POST /messages/:id/retry (failed → queued), /sent-manually (the admin sent it from WhatsApp, so
 * the sender never sends it again) or /hand-off (wa.me opened: held until one of the other two).
 * Not optimistic: the API decides the new state.
 */
export function useMessageAction(phone: string, action: MessageAction) {
  const client = useQueryClient();
  const queryKey = threadKey(phone);
  return useMutation({
    mutationFn: (id: string) => apiSend<MessageView>('POST', `/messages/${id}/${action}`),
    onSuccess: (row) =>
      client.setQueryData<ThreadCache>(queryKey, (old) => replaceMessage(old, row.id, row)),
    onSettled: () => refreshInbox(client, phone),
  });
}
