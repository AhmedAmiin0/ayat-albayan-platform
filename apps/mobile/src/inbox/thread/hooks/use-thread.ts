import type { MessageQuote, TemplateParamsInput, ThreadDetail, ThreadTemplate, MessageView } from '@ab/shared';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend, toQueryString } from '@/core/lib/http/api';
import { refreshInbox, touchInbox } from './inbox-sync';
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

/**
 * GET /threads/:phone (docs/12 H2): the newest page first, `before` the oldest loaded row pages
 * back. The API stamps the inbound rows read when it answers. The persisted client keeps the last
 * answer on disk, so an opened thread reads offline (R-MOB-03). While on screen, useThreadPoll keeps
 * it live: a delta every INBOX_REFRESH_MS, the newest page every THREAD_FULL_MS (pull-to-refresh and
 * opening read the whole thread).
 */
export function useThread(phone: string) {
  const query = useInfiniteQuery({
    queryKey: threadKey(phone),
    queryFn: ({ pageParam }) =>
      apiFetch<ThreadDetail>(`${threadPath(phone)}${toQueryString({ before: pageParam })}`),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.has_more ? last.messages[0]?.created_at : undefined),
  });
  useThreadPoll(phone, query.data !== undefined);
  return query;
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
 * it out again (the caller shows `sendError`). Either way the thread refetches.
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
    onSettled: () => refreshInbox(client, phone),
  });
}

type MessageAction = 'retry' | 'sent-manually' | 'hand-off';

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
