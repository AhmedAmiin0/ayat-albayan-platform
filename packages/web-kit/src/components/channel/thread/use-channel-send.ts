import {
  channelKey,
  channelSeatKey,
  pendingMessage,
  sendIdFor,
  withPending,
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

/**
 * The composer's send: shown at once as my pending row («جارٍ الإرسال…», the clock tick), taken
 * away again if it fails (the box keeps the words). Each text carries a client_id; a failed send's
 * id is kept, so sending the same text again in the same chat is a retry the API answers with the
 * stored message (never a double). After it: the thread, the counts and the assistant's seat
 * (owner 2026-11-16: a 404 there means the student's bringer took the chat over).
 */
export function useChannelSend(refs: ChannelRef) {
  const { audience, studentId } = refs;
  const client = useQueryClient();
  const key = channelKey(audience, studentId);
  const last = useRef<LastAttempt | null>(null);
  const mutation = useMutation({
    mutationFn: (attempt: SendAttempt & TextSend) => sendChannelMessage(refs, attempt),
    onMutate: async (attempt) => {
      await client.cancelQueries({ queryKey: key });
      const before = client.getQueryData<Pages>(key);
      const { body, clientId } = attempt;
      const row = pendingMessage({ body, clientId, at: new Date() });
      client.setQueryData(key, withPending(before, row));
      return { before };
    },
    onError: (_e, _attempt, context) => client.setQueryData(key, context?.before),
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
