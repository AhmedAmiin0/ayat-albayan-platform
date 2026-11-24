import { apiErrorCode, channelEditError, channelMessagePath } from '@ab/client-core';
import { useMutation } from '@tanstack/react-query';
import { apiSend } from '../../lib/http/api';
import { t } from '../../lib/i18n/i18n';
import { useChannelSettle, type ChannelRef } from '../channel-api';

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
  const path = (messageId: string) => channelMessagePath({ ...ref, messageId });
  const edit = useMutation({
    mutationFn: (input: { id: string; body: string }) =>
      apiSend('PATCH', path(input.id), { body: input.body }),
    onSettled: settle,
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiSend('DELETE', path(id)),
    onSettled: settle,
  });
  return { edit, remove };
}
