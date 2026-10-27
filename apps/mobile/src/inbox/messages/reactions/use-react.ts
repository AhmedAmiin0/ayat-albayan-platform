import { reactionMutation, reactionPath, withReactions } from '@ab/client-core';
import type { ReactionResult } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiSend } from '@/core/lib/http/api';
import { requestId } from '@/core/lib/http/request-id';
import { t } from '@/core/lib/i18n/i18n';
import { threadKey, type ThreadCache } from '../../thread/hooks/thread-cache';

/** Why a reaction did not go, in words (the CRM line has no reaction call: 409 reaction_unsupported). */
function reactionError(e: unknown): string {
  const code = e instanceof ApiError && typeof e.body === 'object' && e.body !== null ? Reflect.get(e.body, 'code') : undefined;
  return code === 'reaction_unsupported' ? t.inbox.reactions.unsupported : t.inbox.reactions.failed;
}

/** «تفاعل» (owner 2026-10-27) in the open chat's cache (client-core reactionMutation); `say` tells why it did not go. */
export function useReact(phone: string, say: (text: string) => void) {
  const client = useQueryClient();
  const queryKey = threadKey(phone);
  return useMutation(
    reactionMutation({
      send: ({ message, emoji }) => apiSend<ReactionResult>('PUT', reactionPath(phone, message.id), { emoji, clientRequestId: requestId() }),
      cancel: () => client.cancelQueries({ queryKey }),
      patch: (id, reactions) => client.setQueryData<ThreadCache>(queryKey, (old) => withReactions(old, { id, reactions })),
      fail: (e) => say(reactionError(e)),
    }),
  );
}
