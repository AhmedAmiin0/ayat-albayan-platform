import { anchoredThreadPrefix, reactionMutation, reactionPath, withReactions } from '@ab/client-core';
import type { ReactionResult } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiSend, t } from '@ab/mobile-kit';
import { requestId } from '@/core/lib/http/request-id';
import { threadKey, type ThreadCache } from '@/inbox/thread/hooks/thread-cache';

/** Why a reaction did not go, in words (the CRM line has no reaction call: 409 reaction_unsupported). */
function reactionError(e: unknown): string {
  const code = e instanceof ApiError && typeof e.body === 'object' && e.body !== null ? Reflect.get(e.body, 'code') : undefined;
  return code === 'reaction_unsupported' ? t.inbox.reactions.unsupported : t.inbox.reactions.failed;
}

/** `say` tells why a reaction did not go. */
export function useReact(phone: string, say: (text: string) => void) {
  const client = useQueryClient();
  const queryKey = threadKey(phone);
  return useMutation(
    reactionMutation({
      send: ({ message, emoji }) => apiSend<ReactionResult>('PUT', reactionPath(phone, message.id), { emoji, clientRequestId: requestId() }),
      cancel: () => client.cancelQueries({ queryKey }),
      // The live chat and any window around an old search hit (docs/37): the pill shows in both.
      patch: (id, reactions) => {
        const edit = (old: ThreadCache | undefined) => withReactions(old, { id, reactions });
        client.setQueryData<ThreadCache>(queryKey, edit);
        client.setQueriesData<ThreadCache>({ queryKey: anchoredThreadPrefix(phone) }, edit);
      },
      fail: (e) => say(reactionError(e)),
    }),
  );
}
