import type { MessageQuote, TemplateParamsInput, ThreadDetail, ThreadTemplate, MessageView } from '@ab/shared';
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
  });

/**
 * GET /threads/:phone (docs/12 H2): the newest page first, `before` + `before_id` (the oldest
 * loaded row's time and id: a compound keyset, docs/37) pages back. The API stamps the inbound
 * rows read when it answers. The persisted client keeps the last answer on disk, so an opened
 * thread reads offline (R-MOB-03). While on screen, useThreadPoll keeps it live: a delta every
 * INBOX_REFRESH_MS, the newest page every THREAD_FULL_MS (pull-to-refresh and opening read the
 * whole thread).
 */
export function useThread(phone: string) {
  const query = useInfiniteQuery(threadQuery(phone));
  useThreadPoll(phone, query.data !== undefined);
  return query;
}

/**
 * After a send (docs/43 AU4): every list that shows the chat, and ONE read of the chat's newest
 * page folded in (mergeNewest), however far up she scrolled; older pages are not re-read one by
 * one. A chat not on screen is only marked stale (its GET would stamp it read).
 */
export function refreshSent(client: QueryClient, phone: string): Promise<void> {
  refreshLists(client);
  const queryKey = threadKey(phone);
  return refreshNewest<ThreadCache>({
    shown: () => client.getQueryCache().find({ queryKey, exact: true })?.isActive() === true,
    read: () => client.getQueryData<ThreadCache>(queryKey),
    write: (edit) => client.setQueryData<ThreadCache>(queryKey, edit),
    newest: () => threadGet(threadPath(phone)),
    reload: () => client.invalidateQueries({ queryKey }),
  });
}

/**
 * What the composer sends: session text, or an approved template with its params (H3 / H4). Any
 * registry key: a producer's, or a chat starter imported from Meta (owner 2026-10-12).
 */
export type Outgoing =
  | { kind: 'text'; text: string; replyTo?: MessageQuote }
  | { kind: 'template'; key: ThreadTemplate['key']; params: TemplateParamsInput; preview: string; lessonId?: string };

interface SendInput {
  out: Outgoing;
  /** The provisional row's id and the clientRequestId (rule 8: a retried send returns the first row). */
  id: string;
}

function body({ out, id }: SendInput) {
  if (out.kind === 'text') {
    const reply = out.replyTo ? { replyToMessageId: out.replyTo.id } : {};
    return { text: out.text, clientRequestId: id, ...reply };
  }
  const lesson = out.lessonId ? { lessonId: out.lessonId } : {};
  return { key: out.key, params: out.params, clientRequestId: id, ...lesson };
}

/**
 * Optimistic send: the row shows at once as queued; the API's row replaces it, or a refusal takes
 * it out again (the caller shows `sendError`). Either way the newest page refetches.
 */
export { sendKey } from './thread-cache';

export function useSendMessage(phone: string) {
  const client = useQueryClient();
  const queryKey = threadKey(phone);
  const edit = (fn: (old: ThreadCache | undefined) => ThreadCache | undefined) =>
    client.setQueryData<ThreadCache>(queryKey, fn);
  return useMutation({
    // One key per chat: the composer and «عرض سعر» see each other's send in flight (useIsMutating).
    mutationKey: sendKey(phone),
    mutationFn: (input: SendInput) =>
      apiSend<MessageView>('POST', `${threadPath(phone)}/${input.out.kind}`, body(input)),
    onMutate: async ({ out, id }) => {
      markOwnSend(phone);
      await client.cancelQueries({ queryKey });
      const text = out.kind === 'text' ? out.text : out.preview;
      const key = out.kind === 'template' ? out.key : undefined;
      // An answer shows its quote at once (owner 2026-10-25 «رد»), as the API's row will.
      const quote = out.kind === 'text' && out.replyTo ? { reply_to_message_id: out.replyTo.id, reply_to: out.replyTo } : {};
      const row = { ...provisionalMessage({ id, phone, body: text, templateKey: key }), ...quote };
      edit((old) => appendMessage(old, row));
      await touchInbox(client, row);
    },
    onSuccess: (row, { id }) => edit((old) => replaceMessage(old, id, row)),
    onError: (_error, { id }) => edit((old) => removeMessage(old, id)),
    onSettled: () => refreshSent(client, phone),
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
