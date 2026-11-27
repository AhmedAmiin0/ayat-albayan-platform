import {
  anchoredThreadPrefix,
  messageReactionCalls,
  reactionMutation,
  withReactions,
} from '@ab/client-core';
import type { ThreadDetail } from '@ab/shared';
import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { ApiError, apiFetch, apiSend, t } from '@ab/web-kit';
import { threadQuery } from '@/features/messaging/inbox/api/thread-query';

/** The 409 of a chat on the CRM line (no reaction call there) in words; anything else: try again. */
export function reactionProblem(e: unknown): string {
  const body = e instanceof ApiError ? e.body : null;
  const code = typeof body === 'object' && body !== null ? Reflect.get(body, 'code') : undefined;
  return code === 'reaction_unsupported' ? t.inbox.reactions.unsupported : t.inbox.reactions.failed;
}

const reactions = messageReactionCalls({ apiFetch, apiSend });

export function useReact(phone: string, onFail: (text: string) => void) {
  const client = useQueryClient();
  const { queryKey } = threadQuery(phone);
  return useMutation(
    reactionMutation({
      send: ({ message, emoji }) =>
        reactions.react({
          params: { phone, id: message.id },
          body: { emoji, clientRequestId: crypto.randomUUID() },
        }),
      cancel: () => client.cancelQueries({ queryKey }),
      // The live chat and any anchored window of it (docs/37 review 1) show the same reactions.
      patch: (id, reactions) => {
        type Pages = InfiniteData<ThreadDetail> | undefined;
        const edit = (old: Pages) => withReactions(old, { id, reactions });
        client.setQueryData(queryKey, edit);
        client.setQueriesData({ queryKey: anchoredThreadPrefix(phone) }, edit);
      },
      fail: (e) => onFail(reactionProblem(e)),
    }),
  );
}
