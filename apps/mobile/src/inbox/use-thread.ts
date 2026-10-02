import type { TemplateKey, TemplateParamsInput, ThreadDetail, MessageView } from '@ab/shared';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend, toQueryString } from '@/lib/api';
import {
  appendMessage,
  provisionalMessage,
  removeMessage,
  replaceMessage,
  threadKey,
  threadPath,
  type ThreadCache,
} from './thread-cache';

/**
 * GET /threads/:phone (docs/12 H2): the newest page first, `before` the oldest loaded row pages
 * back. The API stamps the inbound rows read when it answers. The persisted client keeps the last
 * answer on disk, so an opened thread reads offline (R-MOB-03).
 */
export function useThread(phone: string) {
  return useInfiniteQuery({
    queryKey: threadKey(phone),
    queryFn: ({ pageParam }) =>
      apiFetch<ThreadDetail>(`${threadPath(phone)}${toQueryString({ before: pageParam })}`),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.has_more ? last.messages[0]?.created_at : undefined),
  });
}

/** What the composer sends: session text, or an approved template with its params (H3 / H4). */
export type Outgoing =
  | { kind: 'text'; text: string }
  | { kind: 'template'; key: TemplateKey; params: TemplateParamsInput; preview: string; lessonId?: string };

export interface SendInput {
  out: Outgoing;
  /** The provisional row's id and the clientRequestId (rule 8: a retried send returns the first row). */
  id: string;
}

function body({ out, id }: SendInput) {
  if (out.kind === 'text') return { text: out.text, clientRequestId: id };
  const lesson = out.lessonId ? { lessonId: out.lessonId } : {};
  return { key: out.key, params: out.params, clientRequestId: id, ...lesson };
}

/**
 * Optimistic send: the row shows at once as queued; the API's row replaces it, or a refusal takes
 * it out again (the caller shows `sendError`). Either way the thread refetches.
 */
export function useSendMessage(phone: string) {
  const client = useQueryClient();
  const queryKey = threadKey(phone);
  const edit = (fn: (old: ThreadCache | undefined) => ThreadCache | undefined) =>
    client.setQueryData<ThreadCache>(queryKey, fn);
  return useMutation({
    mutationFn: (input: SendInput) =>
      apiSend<MessageView>('POST', `${threadPath(phone)}/${input.out.kind}`, body(input)),
    onMutate: async ({ out, id }) => {
      await client.cancelQueries({ queryKey });
      const text = out.kind === 'text' ? out.text : out.preview;
      const key = out.kind === 'template' ? out.key : undefined;
      edit((old) => appendMessage(old, provisionalMessage({ id, phone, body: text, templateKey: key })));
    },
    onSuccess: (row, { id }) => edit((old) => replaceMessage(old, id, row)),
    onError: (_error, { id }) => edit((old) => removeMessage(old, id)),
    onSettled: () => client.invalidateQueries({ queryKey }),
  });
}

export type MessageAction = 'retry' | 'sent-manually' | 'hand-off';

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
    onSettled: () => client.invalidateQueries({ queryKey }),
  });
}
