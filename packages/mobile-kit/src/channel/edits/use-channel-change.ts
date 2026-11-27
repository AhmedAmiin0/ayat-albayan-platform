import { apiErrorCode, channelEditError, channelWriterOf } from '@ab/client-core';
import { useMutation } from '@tanstack/react-query';
import { t } from '../../lib/i18n/i18n';
import { channelCalls, channelWrites, useChannelSettle, type ChannelRef } from '../channel-api';

/**
 * The API's refusal in words: a window passed, not yours, already deleted, a read-only view, a
 * closed chat (studentChannel.actions.errors); else a failure.
 */
export function channelChangeError(e: unknown): string {
  const known = channelEditError(apiErrorCode(e) ?? undefined);
  return known ? t.studentChannel.actions.errors[known] : t.studentChannel.actions.failed;
}

/** The thread and teacher list re-read after either; the other side hears it over the socket. */
export function useChannelChange(ref: ChannelRef) {
  const settle = useChannelSettle(ref);
  const edit = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      channelWrites[channelWriterOf(ref.audience)].edit({
        studentId: ref.studentId,
        messageId: id,
        body,
      }),
    onSettled: settle,
  });
  const remove = useMutation({
    mutationFn: (messageId: string) =>
      channelCalls[ref.audience].remove({ studentId: ref.studentId, messageId }),
    onSettled: settle,
  });
  return { edit, remove };
}
