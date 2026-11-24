import {
  channelKey,
  channelSeatKey,
  pendingMessage,
  sendIdFor,
  withPending,
  withoutPending,
  type SendAttempt,
} from '@ab/client-core';
import type { ChannelPage } from '@ab/shared';
import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useRef } from 'react';
import {
  channelCountKeys,
  sendChannelMessage,
  type ChannelRef,
} from '@ab/web-kit/components/channel/api';
import { draftKey } from '@ab/web-kit/components/channel/composer/draft-store';
import { errorCode } from '@ab/web-kit/lib/http/error-code';
import { t } from '@ab/web-kit/lib/i18n/i18n';

/** The last attempt and the chat it was for: another student's chat never reuses its id. */
type LastAttempt = SendAttempt & { chat: string };
type Pages = InfiniteData<ChannelPage, string>;

/** A text to send and the message it answers. */
export interface TextSend {
  body: string;
  replyToId?: string | undefined;
}

/** The API's refusal in words (the chat closed or off, the quoted message gone…), else the line. */
function sendProblem(e: unknown): string {
  const errors: Readonly<Record<string, string>> = t.studentChannel.actions.errors;
  return errors[errorCode(e) ?? ''] ?? t.studentChannel.sendFailed;
}

/** A failed send keeps its client_id so a resend is an API-deduped retry. */
export function useChannelSend(refs: ChannelRef) {
  const { audience, studentId } = refs;
  const client = useQueryClient();
  const key = channelKey(audience, studentId);
  const last = useRef<LastAttempt | null>(null);
  const mutation = useMutation({
    mutationFn: (attempt: SendAttempt & TextSend) => sendChannelMessage(refs, attempt),
    onMutate: async (attempt) => {
      await client.cancelQueries({ queryKey: key });
      const { body, clientId } = attempt;
      const row = pendingMessage({ body, clientId, at: new Date() });
      client.setQueryData<Pages>(key, (before) => withPending(before, row));
    },
    // Only this send's row goes: anything that arrived meanwhile (a live message) stays.
    onError: (_e, { clientId }) =>
      client.setQueryData<Pages>(key, (now) => withoutPending(now, clientId)),
    onSuccess: () => {
      last.current = null;
    },
    onSettled: () =>
      Promise.all(
        [key, channelSeatKey(studentId), ...channelCountKeys(studentId)].map((queryKey) =>
          client.invalidateQueries({ queryKey }),
        ),
      ),
  });
  const send = ({ body, replyToId }: TextSend) => {
    const chat = draftKey(refs);
    const before = last.current?.chat === chat ? last.current : null;
    const attempt = { body, clientId: sendIdFor(before, body) };
    last.current = { ...attempt, chat };
    return mutation.mutateAsync({ ...attempt, replyToId });
  };
  const problem = mutation.isError ? sendProblem(mutation.error) : null;
  return { send, pending: mutation.isPending, problem };
}
