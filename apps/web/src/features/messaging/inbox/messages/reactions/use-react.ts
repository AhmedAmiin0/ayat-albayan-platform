import { reactionMutation, reactionPath, withReactions } from '@ab/client-core';
import type { ReactionResult, ThreadDetail } from '@ab/shared';
import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { ApiError, apiSend } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { threadQuery } from '../../api/api';

/** The 409 of a chat on the CRM line (no reaction call there) in words; anything else: try again. */
export function reactionProblem(e: unknown): string {
  const body = e instanceof ApiError ? e.body : null;
  const code = typeof body === 'object' && body !== null ? Reflect.get(body, 'code') : undefined;
  return code === 'reaction_unsupported' ? t.inbox.reactions.unsupported : t.inbox.reactions.failed;
}

/** «تفاعل» (owner 2026-10-27) in the open chat's cache (client-core reactionMutation); `onFail` shows why. */
export function useReact(phone: string, onFail: (text: string) => void) {
  const client = useQueryClient();
  const { queryKey } = threadQuery(phone);
  return useMutation(
    reactionMutation({
      send: ({ message, emoji }) => apiSend<ReactionResult>('PUT', reactionPath(phone, message.id), { emoji, clientRequestId: crypto.randomUUID() }),
      cancel: () => client.cancelQueries({ queryKey }),
      patch: (id, reactions) => client.setQueryData<InfiniteData<ThreadDetail>>(queryKey, (old) => withReactions(old, { id, reactions })),
      fail: (e) => onFail(reactionProblem(e)),
    }),
  );
}
