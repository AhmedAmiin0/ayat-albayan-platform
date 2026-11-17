import { channelKey, sendIdFor, type SendAttempt } from '@ab/client-core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import {
  CHANNEL_COUNT_KEYS,
  sendChannelMessage,
  type ChannelRef,
} from '@/features/teaching/student-channel/api';
import { draftKey } from '@/features/teaching/student-channel/composer/draft-store';

/** The last attempt and the chat it was for: another student's chat never reuses its id. */
type LastAttempt = SendAttempt & { chat: string };

/**
 * The composer's send: each text carries a client_id; a failed send's id is kept, so sending the
 * same text again in the same chat is a retry the API answers with the stored message (never a
 * double).
 */
export function useChannelSend(refs: ChannelRef) {
  const { audience, studentId } = refs;
  const client = useQueryClient();
  const last = useRef<LastAttempt | null>(null);
  const mutation = useMutation({
    mutationFn: (attempt: SendAttempt) => sendChannelMessage({ audience, studentId, ...attempt }),
    onSuccess: () => {
      last.current = null;
    },
    onSettled: () =>
      Promise.all(
        [channelKey(audience, studentId), ...CHANNEL_COUNT_KEYS].map((queryKey) =>
          client.invalidateQueries({ queryKey }),
        ),
      ),
  });
  const send = (body: string) => {
    const chat = draftKey(refs);
    const before = last.current?.chat === chat ? last.current : null;
    const attempt = { body, clientId: sendIdFor(before, body) };
    last.current = { ...attempt, chat };
    return mutation.mutateAsync(attempt);
  };
  return { send, pending: mutation.isPending, failed: mutation.isError };
}
